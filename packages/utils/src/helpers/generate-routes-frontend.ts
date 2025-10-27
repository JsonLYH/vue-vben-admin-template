import type { RouteRecordRaw } from 'vue-router';

import { filterTree, mapTree } from '@vben-core/shared/utils';

/**
 * 动态生成路由 - 前端方式
 */
async function generateRoutesByFrontend(
  routes: RouteRecordRaw[],
  roles: string[],
  forbiddenComponent?: RouteRecordRaw['component'],
): Promise<RouteRecordRaw[]> {
  // 根据角色标识过滤路由表,判断当前用户是否拥有指定权限
  const finalRoutes = filterTree(routes, (route) => {
    return hasAuthority(route, roles);
  });
  // 如果没有403组件，则直接返回最终筛选完成后的路由列表
  if (!forbiddenComponent) {
    return finalRoutes;
  }

  // 如果有禁止访问的页面，将禁止访问的页面替换为403页面
  const mapTreeRoutes = mapTree(finalRoutes, (route) => {
    // 如果route.meta?.authority未配置，则该条件一直不会成立
    // 如果route.meta?.authority配置了，则根据menuVisibleWithForbidden属性判断是否需要替换为403组件
    if (menuHasVisibleWithForbidden(route)) {
      route.component = forbiddenComponent;
    }
    return route;
  });
  return mapTreeRoutes;
}

/**
 * 判断路由是否有权限访问（决定路由是否要注册到router实例中）
 * @param route
 * @param access
 */
function hasAuthority(route: RouteRecordRaw, access: string[]) {
  const authority = route.meta?.authority;
  // 如果未配置该属性，则默认该路由是要注册到router实例中的
  if (!authority) {
    return true;
  }
  const canAccess = access.some((value) => authority.includes(value));
  // 如果配置了该属性，且用户角色在权限列表中，则返回true
  // 如果配置了该属性，且用户角色不在权限列表中，且menuVisibleWithForbidden为true，则返回true
  return canAccess || (!canAccess && menuHasVisibleWithForbidden(route));
}

/**
 * 判断路由是否在菜单中显示，但是访问会被重定向到403
 * @param route
 */
function menuHasVisibleWithForbidden(route: RouteRecordRaw) {
  return (
    !!route.meta?.authority &&
    Reflect.has(route.meta || {}, 'menuVisibleWithForbidden') &&
    !!route.meta?.menuVisibleWithForbidden
  );
}

export { generateRoutesByFrontend, hasAuthority };
