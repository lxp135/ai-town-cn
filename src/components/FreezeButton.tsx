import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import Button from './buttons/Button';

/**
 * 冻结按钮组件：用于手动控制 AI 世界的暂停与恢复
 */
export default function FreezeButton() {
  // 查询当前是否允许执行停止操作
  const stopAllowed = useQuery(api.testing.stopAllowed) ?? false;
  // 获取默认世界的状态
  const defaultWorld = useQuery(api.world.defaultWorldStatus);

  // 判断当前世界是否已被开发者停止（处于冻结状态）
  const frozen = defaultWorld?.status === 'stoppedByDeveloper';

  const unfreeze = useMutation(api.testing.resume);
  const freeze = useMutation(api.testing.stop);

  const flipSwitch = async () => {
    if (frozen) {
      console.log('正在取消冻结');
      await unfreeze();
    } else {
      console.log('正在冻结');
      await freeze();
    }
  };

  // 如果不允许停止，则不显示该按钮
  return !stopAllowed ? null : (
    <>
      <Button
        onClick={flipSwitch}
        className="hidden lg:block"
        title="冻结世界时，智能体在完全进入冻结状态前需要一些时间来停止他们当前正在进行的操作。"
        imgUrl="/assets/star.svg"
      >
        {frozen ? '取消冻结' : '冻结'}
      </Button>
    </>
  );
}