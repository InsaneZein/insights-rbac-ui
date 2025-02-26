import React, { Fragment, useState, useEffect } from 'react';
import propTypes from 'prop-types';
import { Table, TableHeader, TableBody, TableVariant } from '@patternfly/react-table';
import TableToolbar from '@redhat-cloud-services/frontend-components/TableToolbar';
import { Button, Pagination, EmptyStatePrimary } from '@patternfly/react-core';
import { ListLoader } from './loader-placeholders';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { selectedRows } from '../../helpers/shared/helpers';
import Toolbar, { paginationBuilder } from './toolbar';
import EmptyWithAction from './empty-state';
import './table-toolbar-view.scss';

export const TableToolbarView = ({
  isCompact,
  createRows,
  borders,
  columns,
  toolbarButtons,
  data,
  actionResolver,
  areActionsDisabled,
  routes,
  titlePlural,
  titleSingular,
  pagination,
  filterValue,
  isLoading,
  emptyFilters,
  setFilterValue,
  checkedRows,
  isSelectable,
  fetchData,
  setCheckedItems,
  isCollapsible,
  emptyProps,
  filterPlaceholder,
  rowWrapper,
  filters,
  isFilterable,
  onShowMore,
  showMoreTitle,
  onFilter,
  onChange,
  value,
  sortBy,
  isExpandable,
  onExpand,
  hideFilterChips,
  hideHeader,
  noData,
  noDataDescription,
  ouiaId,
  tableId,
  containerRef,
}) => {
  const [opened, openRow] = useState({});
  const [sortByState, setSortByState] = useState({ index: undefined, direction: undefined });
  useEffect(() => {
    setSortByState({
      ...sortBy,
      ...(sortByState.index !== undefined && sortByState),
    });
  }, [sortBy]);

  const rows = createRows(data, opened, checkedRows);

  const onCollapse = (_event, _index, isOpen, { uuid }) =>
    openRow((opened) => ({
      ...opened,
      [uuid]: isOpen,
    }));

  const renderEmpty = () => ({
    title: (
      <EmptyWithAction
        title={`No matching ${titlePlural} found`}
        description={
          noData && noDataDescription ? noDataDescription : [`This filter criteria matches no ${titlePlural}.`, `Try changing your filter settings.`]
        }
        actions={
          noData && noDataDescription
            ? undefined
            : [
                <EmptyStatePrimary key="clear-filters">
                  <Button
                    variant="link"
                    ouiaId="clear-filters-button"
                    onClick={() => {
                      setFilterValue(emptyFilters);
                      fetchData({
                        ...pagination,
                        offset: 0,
                        ...(emptyFilters ? emptyFilters : { name: '' }),
                      });
                    }}
                  >
                    Clear all filters
                  </Button>
                </EmptyStatePrimary>,
              ]
        }
      />
    ),
    props: {
      colSpan: columns.length + Boolean(onCollapse),
    },
  });

  const renderTable = () => {
    const selectColumnOffset = isSelectable && data?.length > 0;
    const sortByIndex = Math.min((sortByState?.index || selectColumnOffset) - selectColumnOffset, columns?.length - 1);
    const sortBy =
      (sortByState.index !== undefined &&
        sortByIndex >= 0 &&
        sortByIndex < columns.length &&
        `${sortByState.direction === 'desc' ? '-' : ''}${columns[sortByIndex].key}`) ||
      undefined;
    return (
      <Fragment>
        <Toolbar
          isSelectable={isSelectable}
          checkedRows={checkedRows}
          setCheckedItems={setCheckedItems}
          isLoading={isLoading || noData}
          data={data}
          titleSingular={titleSingular}
          filterValue={filterValue}
          setFilterValue={setFilterValue}
          sortBy={sortBy}
          pagination={pagination}
          fetchData={fetchData}
          toolbarButtons={toolbarButtons}
          filterPlaceholder={filterPlaceholder}
          filters={filters}
          isFilterable={isFilterable}
          onShowMore={onShowMore}
          showMoreTitle={showMoreTitle}
          onFilter={onFilter}
          onChange={onChange}
          value={value}
          hideFilterChips={hideFilterChips}
          tableId={tableId}
          containerRef={containerRef}
        />
        {isLoading ? (
          <ListLoader />
        ) : (
          <Table
            canSelectAll={false}
            aria-label={`${titlePlural} table`}
            variant={isCompact ? TableVariant.compact : null}
            borders={borders}
            {...(isCollapsible && { onCollapse })}
            {...(isSelectable &&
              rows.length > 0 && {
                onSelect: (_e, isSelected, _idx, { uuid, cells: [name], requires }) =>
                  setCheckedItems(selectedRows([{ uuid, name, requires }], isSelected)),
              })}
            {...(isExpandable && { onExpand })}
            rows={rows.length > 0 ? rows : [{ fullWidth: true, cells: [renderEmpty()] }]}
            cells={columns}
            {...(rows.length > 0 && { actionResolver })}
            className={rows.length == 0 ? 'ins-c-table-empty-state' : ''}
            areActionsDisabled={areActionsDisabled}
            rowWrapper={rowWrapper}
            sortBy={sortByState}
            ouiaId={ouiaId}
            onSort={(e, index, direction) => {
              const sortByIndex = Math.min((index || selectColumnOffset) - selectColumnOffset, columns?.length - 1);
              const orderBy = `${direction === 'desc' ? '-' : ''}${columns[sortByIndex].key}`;
              setSortByState({ index, direction });
              filters && filters.length > 0
                ? fetchData({
                    ...pagination,
                    offset: 0,
                    ...filters.reduce(
                      (acc, curr) => ({
                        ...acc,
                        [curr.key]: curr.value,
                      }),
                      {}
                    ),
                    orderBy,
                  })
                : fetchData({
                    ...pagination,
                    offset: 0,
                    name: filterValue,
                    orderBy,
                  });
            }}
          >
            {!hideHeader && <TableHeader />}
            <TableBody />
          </Table>
        )}
        {!pagination.noBottom && (
          <TableToolbar>
            {!isLoading && <Pagination {...paginationBuilder(pagination, fetchData, filterValue, sortBy)} variant="bottom" dropDirection="up" />}
          </TableToolbar>
        )}
      </Fragment>
    );
  };

  return (
    <Fragment>
      {routes()}
      {!isLoading && rows.length === 0 && filterValue.length === 0 && filters.every(({ value }) => !value) ? (
        <EmptyWithAction
          title={`Configure ${titlePlural}`}
          icon={PlusCircleIcon}
          description={[`To configure user access to applications`, `create at least one ${titleSingular}`]}
          actions={toolbarButtons()[0]}
          {...emptyProps}
        />
      ) : (
        renderTable()
      )}
    </Fragment>
  );
};

TableToolbarView.propTypes = {
  ...Toolbar.propTypes,
  sortBy: propTypes.shape({
    directions: propTypes.string,
    index: propTypes.number,
  }),
  rowWrapper: propTypes.any,
  isCompact: propTypes.bool,
  borders: propTypes.bool,
  emptyFilters: propTypes.object,
  checkedRows: propTypes.array,
  createRows: propTypes.func.isRequired,
  columns: propTypes.array.isRequired,
  titlePlural: propTypes.string,
  routes: propTypes.func,
  actionResolver: propTypes.func,
  areActionsDisabled: propTypes.func,
  pagination: propTypes.shape({
    noBottom: propTypes.bool,
  }),
  isExpandable: propTypes.bool,
  onExpand: propTypes.func,
  hideFilterChips: propTypes.bool,
  hideHeader: propTypes.bool,
  noDataDescription: propTypes.arrayOf(propTypes.node),
  filters: propTypes.array,
  tableId: propTypes.string.isRequired,
};

TableToolbarView.defaultProps = {
  ...Toolbar.defaultProps,
  emptyFilters: {},
  isCompact: false,
  borders: true,
  routes: () => null,
  hideFilterChips: false,
  checkedRows: [],
  hideHeader: false,
};
