import type { RequestClient } from './request-client';
import type { MakeErrorMessageFn, ResponseInterceptorConfig } from './types';

import { $t } from '@vben/locales';
import { preferences } from '@vben/preferences';
import { isFunction } from '@vben/utils';

import axios from 'axios';

type defaultResponseInterceptorType = {
  /** 响应数据中代表访问结果的字段名 */
  codeField: string;
  /** 响应数据中装载实际数据的字段名，或者提供一个函数从响应数据中解析需要返回的数据 */
  dataField: ((response: any) => any) | string;
  /** 当codeField所指定的字段值与successCode相同时，代表接口访问成功。如果提供一个函数，则返回true代表接口访问成功 */
  successCode: ((code: any) => boolean) | number | string;
};
// 默认响应拦截器（先根据http状态码进行判断，再根据业务状态码进行判断）
export const defaultResponseInterceptor = ({
  codeField = 'code',
  dataField = 'data',
  successCode = 0,
}: defaultResponseInterceptorType): ResponseInterceptorConfig => {
  return {
    fulfilled: (response) => {
      const { config, data: responseData, status } = response;
      // 如果是原始格式则响应的内容（包含status、headers、data等），不根据dataField、codeField、successCode进行处理
      if (config.responseReturn === 'raw') {
        return response;
      }
      if (status >= 200 && status < 400) {
        // 返回响应的body部分
        if (config.responseReturn === 'body') {
          return responseData;
        } else if (
          isFunction(successCode)
            ? successCode(responseData[codeField])
            : responseData[codeField] === successCode
        ) {
          // 如果是成功的响应，则响应内容
          return isFunction(dataField)
            ? dataField(responseData)
            : responseData[dataField];
        }
      }
      throw Object.assign({}, response, { response });
    },
  };
};

type authenticateResponseInterceptorType = {
  client: RequestClient;
  doReAuthenticate: () => Promise<void>;
  doRefreshToken: () => Promise<string>;
  enableRefreshToken: boolean;
  formatToken: (token: string) => null | string;
  tokenName: () => string;
};
// 鉴权响应拦截器(根据http状态码进行判断)
export const authenticateResponseInterceptor = ({
  client,
  doReAuthenticate,
  doRefreshToken,
  enableRefreshToken,
  formatToken,
  tokenName = () => 'Authorization',
}: authenticateResponseInterceptorType): ResponseInterceptorConfig => {
  return {
    rejected: async (error) => {
      const { config, response } = error;
      // 如果不是 401 错误，直接抛出异常
      if (response?.status !== 401) {
        throw error;
      }
      // 判断退出登录接口鉴权边界情况
      if (config.url.includes(preferences.app.logoutApiFlag)) {
        return response;
      }
      // 判断是否启用了 refreshToken 功能
      // 如果没有启用刷新token功能或者已经是重试请求了，直接跳转到重新登录
      if (!enableRefreshToken || config.__isRetryRequest) {
        const reAuthenticateFlag = localStorage.getItem('reAuthenticateFlag');
        if (reAuthenticateFlag) {
          return;
        } else {
          // 只需要执行一次重新登录逻辑
          localStorage.setItem('reAuthenticateFlag', '1');
          await doReAuthenticate();
          throw error;
        }
      }
      // 如果正在刷新 token，则将请求加入队列，等待刷新完成
      if (client.isRefreshing) {
        // 异步处理，等待刷新完成
        return new Promise((resolve) => {
          client.refreshTokenQueue.push((newToken: string) => {
            config.headers[tokenName()] = formatToken(newToken);
            resolve(client.request(config.url, { ...config }));
          });
        });
      }
      // 标记开始刷新 token
      client.isRefreshing = true;
      // 标记当前请求为重试请求，避免无限循环
      config.__isRetryRequest = true;

      try {
        // 刷新token（同步处理，最后执行，401这里返回空token）
        const newToken = await doRefreshToken();
        if (!newToken) {
          client.refreshTokenQueue = [];
          await doReAuthenticate();
          throw error;
        }
        // 处理队列中的请求
        client.refreshTokenQueue.forEach((callback) => callback(newToken));
        // 清空队列
        client.refreshTokenQueue = [];
        // 重新请求处理第一次401请求
        return client.request(error.config.url, { ...error.config });
      } catch (refreshError) {
        // 如果刷新 token 失败，处理错误（如强制登出或跳转登录页面）
        client.refreshTokenQueue = [];
        console.error('Refresh token failed, please login again.');
        await doReAuthenticate();
        throw refreshError;
      } finally {
        client.isRefreshing = false;
      }
    },
  };
};

// 错误消息拦截器（根据http状态码进行判断）
export const errorMessageResponseInterceptor = (
  makeErrorMessage?: MakeErrorMessageFn,
): ResponseInterceptorConfig => {
  return {
    rejected: (error: any) => {
      if (axios.isCancel(error)) {
        return Promise.reject(error);
      }

      const err: string = error?.toString?.() ?? '';
      let errMsg = '';
      if (err?.includes('Network Error')) {
        errMsg = $t('ui.fallback.http.networkError');
      } else if (error?.message?.includes?.('timeout')) {
        errMsg = $t('ui.fallback.http.requestTimeout');
      }
      if (errMsg) {
        makeErrorMessage?.(errMsg, error);
        return Promise.reject(error);
      }

      let errorMessage = '';
      const status = error?.response?.status;

      switch (status) {
        case 400: {
          errorMessage = $t('ui.fallback.http.badRequest');
          break;
        }
        case 401: {
          errorMessage = $t('ui.fallback.http.unauthorized');
          break;
        }
        case 403: {
          errorMessage = $t('ui.fallback.http.forbidden');
          break;
        }
        case 404: {
          errorMessage = $t('ui.fallback.http.notFound');
          break;
        }
        case 408: {
          errorMessage = $t('ui.fallback.http.requestTimeout');
          break;
        }
        default: {
          errorMessage = $t('ui.fallback.http.internalServerError');
        }
      }
      // errorMessage为系统默认的错误提示
      makeErrorMessage?.(errorMessage, error);
      return Promise.reject(error);
    },
  };
};
