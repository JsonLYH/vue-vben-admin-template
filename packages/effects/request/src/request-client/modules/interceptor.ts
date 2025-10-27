import type { AxiosInstance, AxiosResponse } from 'axios';

import type {
  RequestInterceptorConfig,
  ResponseInterceptorConfig,
} from '../types';

const defaultRequestInterceptorConfig: RequestInterceptorConfig = {
  fulfilled: (response) => response,
  rejected: (error) => Promise.reject(error),
};

const defaultResponseInterceptorConfig: ResponseInterceptorConfig = {
  fulfilled: (response: AxiosResponse) => response,
  rejected: (error) => Promise.reject(error),
};

class InterceptorManager {
  private axiosInstance: AxiosInstance;

  constructor(instance: AxiosInstance) {
    // axios实例
    this.axiosInstance = instance;
  }

  // 添加请求拦截器
  addRequestInterceptor({
    fulfilled,
    rejected,
  }: RequestInterceptorConfig = defaultRequestInterceptorConfig) {
    this.axiosInstance.interceptors.request.use(fulfilled, rejected);
  }

  // 添加响应拦截器
  addResponseInterceptor<T = any>({
    fulfilled,
    rejected,
  }: ResponseInterceptorConfig<T> = defaultResponseInterceptorConfig) {
    this.axiosInstance.interceptors.response.use(fulfilled, rejected);
  }
}

export { InterceptorManager };
