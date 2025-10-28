import { requestClient,baseRequestClient } from '#/api/request';

export namespace AuthApi {
  /** 登录接口参数 */
  export interface LoginParams {
    password?: string;
    username?: string;
  }

  export interface RefreshTokenParams {
    refreshToken: null | string;
  }

  /** 登录接口返回值 */
  export interface LoginResult {
    accessToken: string;
    refreshToken: string;
    tokenName?: string;
  }

  export interface RefreshTokenResult {
    data: {
      data: string;
    };
    status: number;
  }
}

/**
 * 登录
 */
// export async function loginApi(data: AuthApi.LoginParams) {
//   return requestClient.post<AuthApi.LoginResult>('/auth/login', data);
// }
export async function loginApi(data: AuthApi.LoginParams) {
  return requestClient.post<AuthApi.LoginResult>(
    '/api/v1/adminUser/login',
    data,
  );
}

/**
 * 刷新accessToken
 */
// export async function refreshTokenApi() {
//   return baseRequestClient.post<AuthApi.RefreshTokenResult>('/auth/refresh', {
//     withCredentials: true,
//   });
// }
export async function refreshTokenApi(data: AuthApi.RefreshTokenParams) {
  return baseRequestClient.get<AuthApi.RefreshTokenResult>(
    '/api/v1/adminUser/refreshToken',
    {
      params: data,
    },
  );
}

/**
 * 退出登录
 */
export async function logoutApi() {
  return requestClient.post('/api/v1/adminUser/logout');
}

/**
 * 获取用户权限码
 * 不需要可以直接返回空数组
 */
// export async function getAccessCodesApi() {
//   return requestClient.get<string[]>('/auth/codes');
// }
export async function getAccessCodesApi() {
  return requestClient.get<string[]>('/api/v1/adminUser/getAccessCodes');
}
