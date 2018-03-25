import { routerRedux } from 'dva/router'
import queryString from 'query-string'
import config from '../utils/config'
import { query, logout } from '../services/app'
import * as menuService from '../services/menus'
import enumRoleType from '../utils/enums'

export default {
  namespace: 'app',
  state: {
    user: {},
    permissions: {
      visit: [],
    },
    menu: [],
    locationPathname: '',
  },
  subscriptions: {

    setup ({ dispatch }) {
      dispatch({ type: 'query' })
    },
    setupHistory ({ dispatch, history }) {
      history.listen((location) => {
        dispatch({
          type: 'updateState',
          payload: {
            locationPathname: location.pathname,
            locationQuery: queryString.parse(location.search),
          },
        })
      })
    },
  },
  effects: {
    * query ({ payload }, { call, put, select }) {
      const { success, user } = yield call(query, payload)
      const { locationPathname } = yield select(_ => _.app)
      if (success && user) {
        const { list } = yield call(menuService.query)
        let menu = list
        const { permissions } = user
        if (permissions.role === enumRoleType.ADMIN) {
          permissions.visit = list.map(item => item.id)
        } else {
          menu = list
        }

        yield put({
          type: 'updateState',
          payload: {
            user,
            permissions,
            menu,
          },
        })
        if (locationPathname === '/login') {
          yield put(routerRedux.push({
            pathname: '/dashboard',
          }))
        }
      } else if (config.openPages && config.openPages.indexOf(locationPathname) < 0) {
        yield put(routerRedux.push({
          pathname: '/login',
          search: queryString.stringify({
            from: locationPathname,
          }),
        }))
      }
    },
    * logout ({ payload }, { call, put }) {
      const data = yield call(logout, payload)
      if (data.success) {
        yield put({ type: 'query' })
      } else {
        throw (data)
      }
    },
  },
  reducers: {
    updateState (state, { payload }) {
      return {
        ...state,
        ...payload,
      }
    },
  },
}