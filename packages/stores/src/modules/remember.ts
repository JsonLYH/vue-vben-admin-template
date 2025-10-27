import { acceptHMRUpdate, defineStore } from 'pinia';

interface RememberState {
  /**
   * 登录-记住密码
   */
  rememberPassWordInfo?: any;
}

/**
 * @zh_CN 记住账号相关信息
 */
export const useRememberStore = defineStore('remember', {
  actions: {
    setRememberPassWordInfo(info: any) {
      this.rememberPassWordInfo = info;
    },
  },
  persist: {
    // 持久化
    pick: ['rememberPassWordInfo'],
  },
  state: (): RememberState => ({
    rememberPassWordInfo: {},
  }),
});

// 解决热更新问题
const hot = import.meta.hot;
if (hot) {
  hot.accept(acceptHMRUpdate(useRememberStore, hot));
}
