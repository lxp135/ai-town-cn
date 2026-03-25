// 没错！没有任何导入，也没有任何依赖 🤯

const OPENAI_EMBEDDING_DIMENSION = 1536;
const TOGETHER_EMBEDDING_DIMENSION = 768;
const OLLAMA_EMBEDDING_DIMENSION = 1024;

export const EMBEDDING_DIMENSION: number = OLLAMA_EMBEDDING_DIMENSION;

export function detectMismatchedLLMProvider() {
  switch (EMBEDDING_DIMENSION) {
    case OPENAI_EMBEDDING_DIMENSION:
      if (!process.env.OPENAI_API_KEY) {
        throw new Error(
          "你是否正尝试使用 OpenAI？如果是，请运行：npx convex env set OPENAI_API_KEY '你的密钥'",
        );
      }
      break;
    case TOGETHER_EMBEDDING_DIMENSION:
      if (!process.env.TOGETHER_API_KEY) {
        throw new Error(
          "你是否正尝试使用 Together.ai？如果是，请运行：npx convex env set TOGETHER_API_KEY '你的密钥'",
        );
      }
      break;
    case OLLAMA_EMBEDDING_DIMENSION:
      break;
    default:
      if (!process.env.LLM_API_URL) {
        throw new Error(
          "你是否正尝试使用自定义的云托管 LLM？如果是，请运行：npx convex env set LLM_API_URL '你的链接'",
        );
      }
      break;
  }
}

export interface LLMConfig {
  provider: 'openai' | 'together' | 'ollama' | 'custom';
  url: string; // 末尾不应有斜杠
  chatModel: string;
  embeddingModel: string;
  stopWords: string[];
  apiKey: string | undefined;
}

export function getLLMConfig(): LLMConfig {
  let provider = process.env.LLM_PROVIDER;
  if (provider ? provider === 'openai' : process.env.OPENAI_API_KEY) {
    if (EMBEDDING_DIMENSION !== OPENAI_EMBEDDING_DIMENSION) {
      throw new Error('对于 OpenAI，EMBEDDING_DIMENSION 必须为 1536');
    }
    return {
      provider: 'openai',
      url: 'https://api.openai.com',
      chatModel: process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o-mini',
      embeddingModel: process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-ada-002',
      stopWords: [],
      apiKey: process.env.OPENAI_API_KEY,
    };
  }
  if (process.env.TOGETHER_API_KEY) {
    if (EMBEDDING_DIMENSION !== TOGETHER_EMBEDDING_DIMENSION) {
      throw new Error('对于 Together.ai，EMBEDDING_DIMENSION 必须为 768');
    }
    return {
      provider: 'together',
      url: 'https://api.together.xyz',
      chatModel: process.env.TOGETHER_CHAT_MODEL ?? 'meta-llama/Llama-3-8b-chat-hf',
      embeddingModel:
        process.env.TOGETHER_EMBEDDING_MODEL ?? 'togethercomputer/m2-bert-80M-8k-retrieval',
      stopWords: ['<|eot_id|>'],
      apiKey: process.env.TOGETHER_API_KEY,
    };
  }
  if (process.env.LLM_API_URL) {
    const apiKey = process.env.LLM_API_KEY;
    const url = process.env.LLM_API_URL;
    const chatModel = process.env.LLM_MODEL;
    if (!chatModel) throw new Error('LLM_MODEL 是必需的');
    const embeddingModel = process.env.LLM_EMBEDDING_MODEL;
    if (!embeddingModel) throw new Error('LLM_EMBEDDING_MODEL 是必需的');
    return {
      provider: 'custom',
      url,
      chatModel,
      embeddingModel,
      stopWords: [],
      apiKey,
    };
  }
  // 默认为 Ollama
  if (EMBEDDING_DIMENSION !== OLLAMA_EMBEDDING_DIMENSION) {
    detectMismatchedLLMProvider();
    throw new Error(
      `发现未知的 EMBEDDING_DIMENSION ${EMBEDDING_DIMENSION}` +
      `。详情请参阅 convex/util/llm.ts。`,
    );
  }
  // 备选嵌入模型：
  // embeddingModel: 'llama3'
  // const OLLAMA_EMBEDDING_DIMENSION = 4096,
  return {
    provider: 'ollama',
    url: process.env.OLLAMA_HOST ?? 'http://127.0.0.1:11434',
    chatModel: process.env.OLLAMA_MODEL ?? 'llama3',
    embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL ?? 'mxbai-embed-large',
    stopWords: ['<|eot_id|>'],
    apiKey: undefined,
  };
}

const AuthHeaders = (): Record<string, string> =>
  getLLMConfig().apiKey
    ? {
      Authorization: 'Bearer ' + getLLMConfig().apiKey,
    }
    : {};

// 非流式传输的重载
export async function chatCompletion(
  body: Omit<CreateChatCompletionRequest, 'model'> & {
    model?: CreateChatCompletionRequest['model'];
  } & {
    stream?: false | null | undefined;
  },
): Promise<{ content: string; retries: number; ms: number }>;
// 流式传输的重载
export async function chatCompletion(
  body: Omit<CreateChatCompletionRequest, 'model'> & {
    model?: CreateChatCompletionRequest['model'];
  } & {
    stream?: true;
  },
): Promise<{ content: ChatCompletionContent; retries: number; ms: number }>;
export async function chatCompletion(
  body: Omit<CreateChatCompletionRequest, 'model'> & {
    model?: CreateChatCompletionRequest['model'];
  },
) {
  const config = getLLMConfig();
  body.model = body.model ?? config.chatModel;
  const stopWords = body.stop ? (typeof body.stop === 'string' ? [body.stop] : body.stop) : [];
  if (config.stopWords) stopWords.push(...config.stopWords);
  console.log(body);
  const {
    result: content,
    retries,
    ms,
  } = await retryWithBackoff(async () => {
    const result = await fetch(config.url + '/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...AuthHeaders(),
      },

      body: JSON.stringify(body),
    });
    if (!result.ok) {
      const error = await result.text();
      console.error({ error });
      if (result.status === 404 && config.provider === 'ollama') {
        await tryPullOllama(body.model!, error);
      }
      throw {
        retry: result.status === 429 || result.status >= 500,
        error: new Error(`聊天补全失败，错误代码 ${result.status}：${error}`),
      };
    }
    if (body.stream) {
      return new ChatCompletionContent(result.body!, stopWords);
    } else {
      const json = (await result.json()) as CreateChatCompletionResponse;
      const content = json.choices[0].message?.content;
      if (content === undefined) {
        throw new Error('来自 OpenAI 的意外结果：' + JSON.stringify(json));
      }
      console.log(content);
      return content;
    }
  });

  return {
    content,
    retries,
    ms,
  };
}

export async function tryPullOllama(model: string, error: string) {
  if (error.includes('try pulling')) {
    console.error('未找到嵌入模型，正在从 Ollama 拉取');
    const pullResp = await fetch(getLLMConfig().url + '/api/pull', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: model }),
    });
    console.log('拉取响应', await pullResp.text());
    throw { retry: true, error: `已动态拉取模型。原始错误：${error}` };
  }
}

export async function fetchEmbeddingBatch(texts: string[]) {
  const config = getLLMConfig();
  if (config.provider === 'ollama') {
    return {
      ollama: true as const,
      embeddings: await Promise.all(
        texts.map(async (t) => (await ollamaFetchEmbedding(t)).embedding),
      ),
    };
  }
  const {
    result: json,
    retries,
    ms,
  } = await retryWithBackoff(async () => {
    const result = await fetch(config.url + '/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...AuthHeaders(),
      },

      body: JSON.stringify({
        model: config.embeddingModel,
        input: texts.map((text) => text.replace(/\n/g, ' ')),
      }),
    });
    if (!result.ok) {
      throw {
        retry: result.status === 429 || result.status >= 500,
        error: new Error(`嵌入失败，错误代码 ${result.status}：${await result.text()}`),
      };
    }
    return (await result.json()) as CreateEmbeddingResponse;
  });
  if (json.data.length !== texts.length) {
    console.error(json);
    throw new Error('嵌入数量不符合预期');
  }
  const allembeddings = json.data;
  allembeddings.sort((a, b) => a.index - b.index);
  return {
    ollama: false as const,
    embeddings: allembeddings.map(({ embedding }) => embedding),
    usage: json.usage?.total_tokens,
    retries,
    ms,
  };
}

export async function fetchEmbedding(text: string) {
  const { embeddings, ...stats } = await fetchEmbeddingBatch([text]);
  return { embedding: embeddings[0], ...stats };
}

export async function fetchModeration(content: string) {
  const { result: flagged } = await retryWithBackoff(async () => {
    const result = await fetch(getLLMConfig().url + '/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...AuthHeaders(),
      },

      body: JSON.stringify({
        input: content,
      }),
    });
    if (!result.ok) {
      throw {
        retry: result.status === 429 || result.status >= 500,
        error: new Error(`审核失败，错误代码 ${result.status}：${await result.text()}`),
      };
    }
    return (await result.json()) as { results: { flagged: boolean }[] };
  });
  return flagged;
}

// 根据重试次数，在此时间后重试。
const RETRY_BACKOFF = [1000, 10_000, 20_000]; // 单位为毫秒
const RETRY_JITTER = 100; // 单位为毫秒
type RetryError = { retry: boolean; error: any };

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
): Promise<{ retries: number; result: T; ms: number }> {
  let i = 0;
  for (; i <= RETRY_BACKOFF.length; i++) {
    try {
      const start = Date.now();
      const result = await fn();
      const ms = Date.now() - start;
      return { result, retries: i, ms };
    } catch (e) {
      const retryError = e as RetryError;
      if (i < RETRY_BACKOFF.length) {
        if (retryError.retry) {
          console.log(
            `第 ${i + 1} 次尝试失败，等待 ${RETRY_BACKOFF[i]}ms 后重试...`,
            Date.now(),
          );
          await new Promise((resolve) =>
            setTimeout(resolve, RETRY_BACKOFF[i] + RETRY_JITTER * Math.random()),
          );
          continue;
        }
      }
      if (retryError.error) throw retryError.error;
      else throw e;
    }
  }
  throw new Error('无法到达的代码区域');
}

// 摘自 openai 的包
export interface LLMMessage {
  /**
   * 消息内容。所有消息都必须包含 `content`，对于带有函数调用的助手消息，该值可能为 null。
   */
  content: string | null;

  /**
   * 消息作者的角色。可选值为 `system`, `user`, `assistant`, 或 `function`。
   */
  role: 'system' | 'user' | 'assistant' | 'function';

  /**
   * 此消息作者的名称。如果角色是 `function`，则必须提供 `name`，且应为响应内容所属的函数名称。
   * 可包含 a-z, A-Z, 0-9 和下划线，最大长度为 64 个字符。
   */
  name?: string;

  /**
   * 应调用的函数名称和参数，由模型生成。
   */
  function_call?: {
    // 要调用的函数名称。
    name: string;
    /**
     * 调用函数所需的参数，由模型以 JSON 格式生成。
     * 请注意，模型生成的 JSON 并不总是有效的，并且可能会幻觉出函数定义中未定义的参数。
     * 在代码中调用函数之前，请务必验证参数。
     */
    arguments: string;
  };
}

// 非流式聊天补全响应
interface CreateChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index?: number;
    message?: {
      role: 'system' | 'user' | 'assistant';
      content: string;
    };
    finish_reason?: string;
  }[];
  usage?: {
    completion_tokens: number;

    prompt_tokens: number;

    total_tokens: number;
  };
}

interface CreateEmbeddingResponse {
  data: {
    index: number;
    object: string;
    embedding: number[];
  }[];
  model: string;
  object: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface CreateChatCompletionRequest {
  /**
   * 要使用的模型 ID。
   * @type {string}
   * @memberof CreateChatCompletionRequest
   */
  model: string;
  /**
   * 用于生成聊天补全的消息，格式参见：
   * https://platform.openai.com/docs/guides/chat/introduction
   * @type {Array<ChatCompletionRequestMessage>}
   * @memberof CreateChatCompletionRequest
   */
  messages: LLMMessage[];
  /**
   * 使用什么样的采样温度，介于 0 到 2 之间。较高的值（如 0.8）会使输出更随机，而较低的值（如 0.2）会使其更集中且具备确定性。
   * 通常建议修改此参数或 `top_p`，但不要同时修改两者。
   * @type {number}
   * @memberof CreateChatCompletionRequest
   */
  temperature?: number | null;
  /**
   * 温度采样的替代方案，称为核采样（nucleus sampling）。模型仅考虑具有 top_p 概率质量的标记结果。
   * 例如 0.1 意味着只考虑组成前 10% 概率质量的标记。
   * 通常建议修改此参数或 `temperature`，但不要同时修改两者。
   * @type {number}
   * @memberof CreateChatCompletionRequest
   */
  top_p?: number | null;
  /**
   * 为每条输入消息生成多少个聊天补全选项。
   * @type {number}
   * @memberof CreateChatCompletionRequest
   */
  n?: number | null;
  /**
   * 如果设置，将发送部分消息增量（delta），类似于 ChatGPT。
   * 标记将在可用时作为 [服务器发送事件](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#Event_stream_format) 发送，并以 `data: [DONE]` 消息终止流。
   * @type {boolean}
   * @memberof CreateChatCompletionRequest
   */
  stream?: boolean | null;
  /**
   *
   * @type {CreateChatCompletionRequestStop}
   * @memberof CreateChatCompletionRequest
   */
  stop?: Array<string> | string;
  /**
   * 生成回答允许的最大标记数。默认情况下，模型可以返回的标记数为 (4096 - 提示词标记数)。
   * @type {number}
   * @memberof CreateChatCompletionRequest
   */
  max_tokens?: number;
  /**
   * 介于 -2.0 和 2.0 之间的数字。正值会根据新标记是否已在文本中出现来对其进行惩罚，从而增加模型讨论新话题的可能性。
   * @type {number}
   * @memberof CreateChatCompletionRequest
   */
  presence_penalty?: number | null;
  /**
   * 介于 -2.0 和 2.0 之间的数字。正值会根据新标记在文本中的现有频率对其进行惩罚，从而降低模型逐字重复同一行文字的可能性。
   * @type {number}
   * @memberof CreateChatCompletionRequest
   */
  frequency_penalty?: number | null;
  /**
   * 修改指定标记在补全结果中出现的可能性。
   * 接受一个 JSON 对象，将标记 ID 映射到 -100 到 100 的偏置值。
   * @type {object}
   * @memberof CreateChatCompletionRequest
   */
  logit_bias?: object | null;
  /**
   * 代表终端用户的唯一标识符，可帮助 OpenAI 监控和检测滥用行为。
   * @type {string}
   * @memberof CreateChatCompletionRequest
   */
  user?: string;
  tools?: {
    // 工具类型。目前仅支持 function。
    type: 'function';
    function: {
      /**
       * 要调用的函数名称。必须包含 a-z, A-Z, 0-9，或下划线和连字符，最大长度为 64。
       */
      name: string;
      /**
       * 函数功能的描述，模型根据此描述选择何时以及如何调用函数。
       */
      description?: string;
      /**
       * 函数接受的参数，描述为 JSON Schema 对象。
       */
      parameters: object;
    };
  }[];
  /**
   * 控制模型调用哪个（如果有）函数。`none` 意味着模型不会调用函数而是生成消息。
   * `auto` 意味着模型可以在生成消息或调用函数之间选择。
   */
  tool_choice?:
    | 'none'
    | 'auto'
    | {
    type: 'function';
    function: { name: string };
  };
  /**
   * 指定模型必须输出的格式的对象。
   *
   * 设置为 { "type": "json_object" } 可启用 JSON 模式，保证模型生成的消息是有效的 JSON。
   * *重要提示*：使用 JSON 模式时，您还必须通过系统或用户消息指示模型自行生成 JSON。如果不这样做，模型可能会生成一个无休止的空白字符流，直到生成过程达到令牌限制，从而导致长时间运行且看似“停滞”的请求。
   * 另外请注意，如果 finish_reason="length"，则消息内容可能会部分被截断，这表示生成过程超过了 max_tokens 或对话超过了 max_context_length 的限制。
   */
  response_format?: { type: 'text' | 'json_object' };
}

// 检查 s1 的后缀是否为 s2 的前缀。例如：
// ('Hello', 'Kira:') -> false
// ('Hello Kira', 'Kira:') -> true
const suffixOverlapsPrefix = (s1: string, s2: string) => {
  for (let i = 1; i <= Math.min(s1.length, s2.length); i++) {
    const suffix = s1.substring(s1.length - i);
    const prefix = s2.substring(0, i);
    if (suffix === prefix) {
      return true;
    }
  }
  return false;
};

export class ChatCompletionContent {
  private readonly body: ReadableStream<Uint8Array>;
  private readonly stopWords: string[];

  constructor(body: ReadableStream<Uint8Array>, stopWords: string[]) {
    this.body = body;
    this.stopWords = stopWords;
  }

  async *readInner() {
    for await (const data of this.splitStream(this.body)) {
      if (data.startsWith('data: ')) {
        try {
          const json = JSON.parse(data.substring('data: '.length)) as {
            choices: { delta: { content?: string } }[];
          };
          if (json.choices[0].delta.content) {
            yield json.choices[0].delta.content;
          }
        } catch (e) {
          // 例如：最后一块是 [DONE]，它不是有效的 JSON。
        }
      }
    }
  }

  // OpenAI API 中的停止词（stop words）并不总是有效。
  // 所以我们必须在自己这一侧进行截断。
  async *read() {
    let lastFragment = '';
    for await (const data of this.readInner()) {
      lastFragment += data;
      let hasOverlap = false;
      for (const stopWord of this.stopWords) {
        const idx = lastFragment.indexOf(stopWord);
        if (idx >= 0) {
          yield lastFragment.substring(0, idx);
          return;
        }
        if (suffixOverlapsPrefix(lastFragment, stopWord)) {
          hasOverlap = true;
        }
      }
      if (hasOverlap) continue;
      yield lastFragment;
      lastFragment = '';
    }
    yield lastFragment;
  }

  async readAll() {
    let allContent = '';
    for await (const chunk of this.read()) {
      allContent += chunk;
    }
    return allContent;
  }

  async *splitStream(stream: ReadableStream<Uint8Array>) {
    const reader = stream.getReader();
    let lastFragment = '';
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          // 完成后刷新最后一个片段
          if (lastFragment !== '') {
            yield lastFragment;
          }
          break;
        }
        const data = new TextDecoder().decode(value);
        lastFragment += data;
        const parts = lastFragment.split('\n\n');
        // 生成除最后一部分外的所有部分
        for (let i = 0; i < parts.length - 1; i += 1) {
          yield parts[i];
        }
        // 将最后一部分保存为新的最后一个片段
        lastFragment = parts[parts.length - 1];
      }
    } finally {
      reader.releaseLock();
    }
  }
}

export async function ollamaFetchEmbedding(text: string) {
  const config = getLLMConfig();
  const { result } = await retryWithBackoff(async () => {
    const resp = await fetch(config.url + '/api/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: config.embeddingModel, prompt: text }),
    });
    if (resp.status === 404) {
      const error = await resp.text();
      await tryPullOllama(config.embeddingModel, error);
      throw new Error(`获取嵌入失败：${resp.status}`);
    }
    return (await resp.json()).embedding as number[];
  });
  return { embedding: result };
}