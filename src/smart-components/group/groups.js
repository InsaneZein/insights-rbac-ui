import React, { Fragment, useContext, useEffect, useState } from 'react';
import { Link, Route, Switch, useHistory } from 'react-router-dom';
import { sortable } from '@patternfly/react-table';
import { Button, Stack, StackItem } from '@patternfly/react-core';
import AddGroupWizard from './add-group/add-group-wizard';
import EditGroup from './edit-group-modal';
import RemoveGroup from './remove-group-modal';
import { shallowEqual, useSelector, useDispatch } from 'react-redux';
import { TableToolbarView } from '../../presentational-components/shared/table-toolbar-view';
import { createRows } from './group-table-helpers';
import { fetchAdminGroup, fetchGroups, fetchSystemGroup } from '../../redux/actions/group-actions';
import Group from './group';
import { TopToolbar, TopToolbarTitle } from '../../presentational-components/shared/top-toolbar';
import Section from '@redhat-cloud-services/frontend-components/Section';
import Role from '../role/role';
import GroupRowWrapper from './group-row-wrapper';
import pathnames from '../../utilities/pathnames';
import './groups.scss';
import PageActionRoute from '../common/page-action-route';
import { applyPaginationToUrl, isPaginationPresentInUrl, syncDefaultPaginationWithUrl } from '../../helpers/shared/pagination';
import { applyFiltersToUrl, areFiltersPresentInUrl, syncDefaultFiltersWithUrl } from '../../helpers/shared/filters';
import { getBackRoute } from '../../helpers/shared/helpers';
import PermissionsContext from '../../utilities/permissions-context';

const columns = [
  { title: 'Name', key: 'name', transforms: [sortable] },
  { title: 'Roles' },
  { title: 'Members' },
  { title: 'Last modified', key: 'modified', transforms: [sortable] },
];

const Groups = () => {
  const dispatch = useDispatch();
  const history = useHistory();
  const fetchData = (options) => dispatch(fetchGroups({ ...options, inModal: false }));
  const { orgAdmin, userAccessAdministrator } = useContext(PermissionsContext);
  const isAdmin = orgAdmin || userAccessAdministrator;

  const { groups, meta, filters, isLoading, systemGroup } = useSelector(
    ({ groupReducer: { groups, isLoading, adminGroup, systemGroup } }) => ({
      groups: [
        ...(adminGroup?.name?.match(new RegExp(groups.filters.name, 'i')) ? [adminGroup] : []),
        ...(systemGroup?.name?.match(new RegExp(groups.filters.name, 'i')) ? [systemGroup] : []),
        ...(groups?.data?.filter(({ platform_default, admin_default } = {}) => !(platform_default || admin_default)) || []),
      ],
      meta: groups?.pagination || groups?.meta,
      filters: groups?.filters,
      isLoading,
      systemGroup,
    }),
    shallowEqual
  );

  const [pagination, setPagination] = useState(meta);
  const [filterValue, setFilterValue] = useState(filters.name || '');
  const [selectedRows, setSelectedRows] = useState([]);
  const [removeGroupsList, setRemoveGroupsList] = useState([]);

  useEffect(() => {
    const syncedPagination = syncDefaultPaginationWithUrl(history, pagination);
    setPagination(syncedPagination);
    const { name } = syncDefaultFiltersWithUrl(history, ['name'], { name: filterValue });
    setFilterValue(name);
    insights.chrome.appNavClick({ id: 'groups', secondaryNav: true });
    fetchData({ ...syncedPagination, filters: { name } });
    dispatch(fetchAdminGroup(name));
    dispatch(fetchSystemGroup(name));
  }, []);

  useEffect(() => {
    isPaginationPresentInUrl(history) || applyPaginationToUrl(history, pagination.limit, pagination.offset);
    filterValue?.length > 0 && !areFiltersPresentInUrl(history, ['name']) && syncDefaultFiltersWithUrl(history, ['name'], { name: filterValue });
  });

  const setCheckedItems = (newSelection) => {
    setSelectedRows((rows) =>
      newSelection(rows)
        .filter(({ platform_default: isPlatformDefault, admin_default: isAdminDefault }) => !(isPlatformDefault || isAdminDefault))
        .map(({ uuid, name }) => ({ uuid, label: name }))
    );
  };

  useEffect(() => {
    pagination.redirected && applyPaginationToUrl(history, pagination.limit, pagination.offset);
  }, [pagination.redirected]);

  useEffect(() => {
    setFilterValue(filters.name);
    setPagination(meta);
  }, [filters, meta]);

  const routes = () => (
    <Fragment>
      <Route exact path={pathnames['add-group'].path}>
        <AddGroupWizard
          pagination={pagination}
          filters={filters}
          postMethod={(config) => {
            fetchData(config);
            setFilterValue('');
          }}
        />
      </Route>
      <Route exact path={pathnames['group-edit'].path}>
        <EditGroup
          pagination={pagination}
          filters={filters}
          postMethod={(config) => {
            fetchData(config);
          }}
          cancelRoute={getBackRoute(pathnames.groups.path, pagination, filters)}
          submitRoute={getBackRoute(pathnames.groups.path, { ...pagination, offset: 0 }, filters)}
        />
      </Route>
      <Route exact path={pathnames['remove-group'].path}>
        <RemoveGroup
          pagination={pagination}
          filters={filters}
          postMethod={(ids, config) => {
            fetchData(config);
            setSelectedRows(selectedRows.filter((row) => !ids.includes(row.uuid)));
          }}
          cancelRoute={getBackRoute(pathnames.groups.path, pagination, filters)}
          submitRoute={getBackRoute(pathnames.groups.path, { ...pagination, offset: 0 }, filters)}
          isModalOpen
          groupsUuid={removeGroupsList}
        />
      </Route>
    </Fragment>
  );

  const actionResolver = ({ isPlatformDefault, isAdminDefault }) =>
    isPlatformDefault || isAdminDefault || !isAdmin
      ? null
      : [
          {
            title: 'Edit',
            onClick: (_event, _rowId, group) => {
              history.push(`/groups/edit/${group.uuid}`);
            },
          },
          {
            title: 'Delete',
            onClick: (_event, _rowId, group) => {
              setRemoveGroupsList([group]);
              history.push(pathnames['remove-group'].path);
            },
          },
        ];

  // TODO check this later
  const toolbarButtons = () => [
    ...(isAdmin
      ? [
          <Link to={pathnames['add-group'].path} key="add-group" className="rbac-m-hide-on-sm">
            <Button ouiaId="create-group-button" variant="primary" aria-label="Create group">
              Create group
            </Button>
          </Link>,
          {
            label: 'Create group',
            props: {
              className: 'rbac-m-hide-on-md',
            },
            onClick: () => {
              history.push(pathnames['add-group'].path);
            },
          },
          {
            label: 'Edit',
            props: {
              isDisabled: !(selectedRows.length === 1),
            },
            onClick: () => history.push(`/groups/edit/${selectedRows[0].uuid}`),
          },
          {
            label: 'Delete',
            props: {
              isDisabled: !selectedRows.length > 0,
            },
            onClick: () => {
              setRemoveGroupsList(selectedRows);
              history.push(pathnames['remove-group'].path);
            },
          },
        ]
      : []),
  ];

  const renderGroupsList = () => (
    <Stack className="rbac-c-groups">
      <StackItem>
        <TopToolbar paddingBottom>
          <TopToolbarTitle title="Groups" />
        </TopToolbar>
      </StackItem>
      <StackItem>
        <Section type="content" id={'tab-groups'}>
          <TableToolbarView
            data={groups.map((group) =>
              group.platform_default || group.admin_default ? { ...group, principalCount: `All${group.admin_default ? ' org admins' : ''}` } : group
            )}
            createRows={(...args) => createRows(isAdmin, ...args)}
            columns={columns}
            isSelectable={isAdmin}
            checkedRows={selectedRows}
            setCheckedItems={setCheckedItems}
            routes={routes}
            actionResolver={actionResolver}
            titlePlural="groups"
            titleSingular="group"
            ouiaId="groups-table"
            pagination={pagination}
            filterValue={filterValue}
            fetchData={(config) => {
              const { name, count, limit, offset, orderBy } = config;
              applyPaginationToUrl(history, limit, offset);
              applyFiltersToUrl(history, { name });
              return fetchData({ count, limit, offset, orderBy, filters: { name } });
            }}
            setFilterValue={({ name = '' }) => setFilterValue(name)}
            toolbarButtons={toolbarButtons}
            isLoading={!isLoading && groups?.length === 0 && filterValue?.length === 0 ? true : isLoading}
            filterPlaceholder="name"
            rowWrapper={GroupRowWrapper}
            tableId="groups"
          />
        </Section>
      </StackItem>
    </Stack>
  );
  return (
    <Switch>
      <PageActionRoute pageAction="role-detail" path={pathnames['group-detail-role-detail'].path} render={(props) => <Role {...props} />} />
      <PageActionRoute
        pageAction="group-detail"
        path={pathnames['group-detail'].path}
        render={(props) => (
          <Group
            {...props}
            defaultUuid={systemGroup?.uuid}
            onDelete={(uuid) => {
              setFilterValue('');
              setSelectedRows(selectedRows.filter((row) => row.uuid != uuid));
            }}
          />
        )}
      />
      <PageActionRoute pageAction="group-list" path={pathnames.groups.path} render={() => renderGroupsList()} />
    </Switch>
  );
};

export default Groups;
