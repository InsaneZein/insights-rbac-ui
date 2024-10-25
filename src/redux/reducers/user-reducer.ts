import { FETCH_USERS, UPDATE_USERS_FILTERS } from '../action-types';
import { defaultSettings, PaginationDefaultI } from '../../helpers/shared/pagination';
import { UserProps } from '../../smart-components/user/user-table-helpers';

export interface User {
  email: string;
  external_source_id: number;
  first_name: string;
  is_active: boolean;
  is_org_admin: boolean;
  last_name: string;
  username: string;
  uuid?: number;
}

export interface UserFilters {
  username?: string;
  email?: string;
  status?: string[];
}
export interface UserStore {
  selectedUser: Record<string, unknown>;
  isUserDataLoading: boolean;
  users: {
    meta: PaginationDefaultI;
    filters: UserFilters;
    pagination: PaginationDefaultI & { redirected?: boolean };
    data?: UserProps[];
  };
}

// Initial State
export const usersInitialState: UserStore = {
  selectedUser: {},
  isUserDataLoading: false,
  users: {
    meta: defaultSettings,
    filters: {},
    pagination: { ...defaultSettings, redirected: false },
  },
};

const setLoadingState = (state: any) => ({
  ...state,
  isUserDataLoading: true,
  users: {
    ...state.users,
    pagination: {
      ...state.users.pagination,
      redirected: false,
    },
  },
});

const setUsers = (state: UserStore, { payload }: any) => ({
  ...state,
  users: { pagination: state.users?.pagination, filters: state.users?.filters, ...payload },
  isUserDataLoading: false,
});

const setFilters = (state: any, { payload }: any) => ({ ...state, users: { ...state.users, filters: payload } });

export default {
  [`${FETCH_USERS}_PENDING`]: setLoadingState,
  [`${FETCH_USERS}_FULFILLED`]: setUsers,
  [UPDATE_USERS_FILTERS]: setFilters,
};
