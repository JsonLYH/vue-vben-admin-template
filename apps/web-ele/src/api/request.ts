/**
 * 该文件可自行根据业务逻辑进行调整
 */
import type { RequestClientOptions } from '@vben/request';

import { useAppConfig } from '@vben/hooks';
import { $t } from '@vben/locales';
import { preferences } from '@vben/preferences';
import {
  authenticateResponseInterceptor,
  defaultResponseInterceptor,
  errorMessageResponseInterceptor,
  RequestClient,
} from '@vben/request';
import { useAccessStore } from '@vben/stores';
import { showMessage } from '@vben/utils';

import { ElMessage } from 'element-plus';

import { useAuthStore } from '#/store';

import { refreshTokenApi } from './core';

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

function createRequestClient(
  baseURL: string,
  options: RequestClientOptions = {},
) {
  const client = new RequestClient({
    ...options,
    baseURL,
  });

  /**
   * 重新认证逻辑
   */
  async function doReAuthenticate() {
    console.warn('Access token or refresh token is invalid or expired. ');
    const accessStore = useAccessStore();
    const authStore = useAuthStore();
    if (
      preferences.app.loginExpiredMode === 'modal' &&
      accessStore.isAccessChecked
    ) {
      accessStore.setLoginExpired(true);
    } else {
      await authStore.logout();
    }
    accessStore.setAccessToken(null);
  }

  /**
   * 刷新token逻辑
   */
  async function doRefreshToken() {
    const accessStore = useAccessStore();
    const res = await refreshTokenApi({
      refreshToken: `${accessStore.refreshToken}`,
    });
    const newToken = res.data.data;
    // 更新最新的token
    accessStore.setAccessToken(`${newToken}`);
    return newToken;
  }

  // 格式化token
  function formatToken(token: null | string) {
    return token ? `Bearer ${token}` : null;
  }

  // 请求拦截器
  client.addRequestInterceptor({
    fulfilled: async (config) => {
      const accessStore = useAccessStore();
      if (accessStore.tokenName) {
        config.headers[accessStore.tokenName] = formatToken(
          accessStore.accessToken,
        );
      }
      config.headers['Accept-Language'] = preferences.app.locale;
      return config;
    },
  });

  // 处理返回的响应数据格式，如果dataField不是一个函数，则默认是直接返回response['dataField']内容
  client.addResponseInterceptor(
    defaultResponseInterceptor({
      codeField: 'code',
      dataField: 'data',
      successCode: 200,
    }),
  );

  // token过期的处理
  client.addResponseInterceptor(
    authenticateResponseInterceptor({
      client,
      doReAuthenticate,
      doRefreshToken,
      enableRefreshToken: preferences.app.enableRefreshToken,
      formatToken,
      tokenName: () => {
        const accessStore = useAccessStore();
        return accessStore.tokenName || 'Authorization';
      },
    }),
  );

  // 通用的错误处理,如果没有进入上面的错误处理逻辑，就会进入这里
  client.addResponseInterceptor(
    errorMessageResponseInterceptor((msg: string, error) => {
      // 这里可以根据业务进行定制,你可以拿到 error 内的信息进行定制化处理，根据不同的 code 做不同的提示，而不是直接使用 message.error 提示 msg
      // 当前mock接口返回的错误字段是 error 或者 message
      const responseData = error?.response?.data ?? {};
      let errorMessage = responseData?.error ?? responseData?.message ?? '';
      // 如果数据响应的错误格式存在code
      if (error.code) {
        // 使用baseRequestClient客户端报的错
        switch (error.code) {
          case 224_256: {
            // token错误
            errorMessage = $t('ui.fallback.http.unauthorized');
            break;
          }
        }
      }
      // 如果没有错误信息，则会根据状态码进行提示
      showMessage(ElMessage, errorMessage || msg);
    }),
  );

  return client;
}
/**
 * responseReturn配置为'data' 则根据以下响应拦截器进行返回
 * defaultResponseInterceptor({
      codeField: 'code',
      dataField: 'data',
      successCode: 0,
    })
 */
export const requestClient = createRequestClient(apiURL, {
  responseReturn: 'data',
});

export const baseRequestClient = new RequestClient({ baseURL: apiURL });
