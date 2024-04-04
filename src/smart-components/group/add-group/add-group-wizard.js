import React, { useState, createContext, useRef } from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { useIntl } from 'react-intl';
import { Wizard } from '@patternfly/react-core/deprecated';
import { addNotification } from '@redhat-cloud-services/frontend-components-notifications/';
import FormRenderer from '@data-driven-forms/react-form-renderer/form-renderer';
import Pf4FormTemplate from '@data-driven-forms/pf4-component-mapper/form-template';
import componentMapper from '@data-driven-forms/pf4-component-mapper/component-mapper';
import WarningModal from '@patternfly/react-component-groups/dist/dynamic/WarningModal';
import { schemaBuilder } from './schema';
import { addGroup, addServiceAccountsToGroup } from '../../../redux/actions/group-actions';
import { createQueryParams } from '../../../helpers/shared/helpers';
import SetName from './set-name';
import SetRoles from './set-roles';
import SetUsers from './set-users';
import SetServiceAccounts from './set-service-accounts';
import SummaryContent from './summary-content';
import AddGroupSuccess from './add-group-success';
import useAppNavigate from '../../../hooks/useAppNavigate';
import paths from '../../../utilities/pathnames';
import messages from '../../../Messages';

export const AddGroupWizardContext = createContext({
  success: false,
  submitting: false,
  error: undefined,
  // eslint-disable-next-line no-unused-vars
  setHideForm: (newValue) => null,
  // eslint-disable-next-line no-unused-vars
  setWizardSuccess: (newValue) => null,
});

const FormTemplate = (props) => <Pf4FormTemplate {...props} showFormControls={false} />;

const Description = ({ Content, ...rest }) => <Content {...rest} />;
Description.propTypes = {
  Content: PropTypes.elementType.isRequired,
};

export const mapperExtension = {
  description: Description,
  'set-name': SetName,
  'set-roles': SetRoles,
  'set-users': SetUsers,
  'set-service-accounts': SetServiceAccounts,
  'summary-content': SummaryContent,
};

export const onCancel = (emptyCallback, nonEmptyCallback, setGroupData) => (formData) => {
  setGroupData(formData);
  if (Object.keys(formData).length > 0) {
    nonEmptyCallback(true);
  } else {
    emptyCallback();
  }
};

const AddGroupWizard = ({ postMethod, pagination, filters, orderBy }) => {
  const dispatch = useDispatch();
  const intl = useIntl();
  const container = useRef(document.createElement('div'));
  const schema = useRef(schemaBuilder(container.current));
  const navigate = useAppNavigate();
  const [groupData, setGroupData] = useState({});
  const [wizardContextValue, setWizardContextValue] = useState({
    success: false,
    submitting: false,
    error: undefined,
    hideForm: false,
  });

  const redirectToGroups = () => {
    dispatch(
      addNotification({
        variant: 'warning',
        title: intl.formatMessage(messages.addingGroupTitle),
        dismissDelay: 8000,
        description: intl.formatMessage(messages.addingGroupCanceledDescription),
      })
    );
    navigate({
      pathname: paths.groups.link,
      search: createQueryParams({ page: 1, per_page: pagination.limit, ...filters }),
    });
  };

  const setWizardError = (error) => setWizardContextValue((prev) => ({ ...prev, error }));
  const setWizardCanceled = (canceled) => setWizardContextValue((prev) => ({ ...prev, canceled }));
  const setWizardSuccess = (success) => setWizardContextValue((prev) => ({ ...prev, success }));
  const setHideForm = (hideForm) => setWizardContextValue((prev) => ({ ...prev, hideForm }));

  const onSubmit = (formData) => {
    const serviceAccountsAdded = formData['service-accounts-list']?.length > 0;
    setWizardContextValue((prev) => ({ ...prev, submitting: true, submittingGroup: true, submittingServiceAccounts: serviceAccountsAdded }));
    const groupData = {
      name: formData['group-name'],
      description: formData['group-description'],
      user_list: formData['users-list'].map((user) => ({ username: user.label })),
      roles_list: formData['roles-list'].map((role) => role.uuid),
    };
    dispatch(addGroup(groupData)).then(({ value }) => {
      setWizardContextValue((prev) => ({
        ...prev,
        submittingGroup: false,
        success: !serviceAccountsAdded,
        hideForm: !serviceAccountsAdded,
        submitting: serviceAccountsAdded,
      }));
      serviceAccountsAdded &&
        dispatch(addServiceAccountsToGroup(value.uuid, formData['service-accounts-list']))
          .then(() => {
            setWizardContextValue((prev) => ({ ...prev, submitting: false, submittingServiceAccounts: false, success: true, hideForm: true }));
          })
          .catch(() => setWizardError(true));
    });
  };

  const onClose = () => {
    setWizardContextValue((prev) => ({ ...prev, success: false, hideForm: false }));
    postMethod({ limit: pagination.limit, offset: 0, orderBy, filters: {} });
    navigate({
      pathname: paths.groups.link,
      search: createQueryParams({ page: 1, per_page: pagination.limit }),
    });
  };

  return (
    <AddGroupWizardContext.Provider value={{ ...wizardContextValue, setWizardError, setWizardSuccess, setHideForm }}>
      <WarningModal
        title={intl.formatMessage(messages.exitItemCreation, { item: intl.formatMessage(messages.group).toLocaleLowerCase() })}
        isOpen={wizardContextValue.canceled}
        onClose={() => {
          container.current.hidden = false;
          setWizardCanceled(false);
        }}
        confirmButtonLabel={intl.formatMessage(messages.discard)}
        onConfirm={redirectToGroups}
      >
        {intl.formatMessage(messages.discardedInputsWarning)}
      </WarningModal>
      {wizardContextValue.hideForm ? (
        wizardContextValue.success ? (
          <Wizard
            isOpen
            title={intl.formatMessage(messages.createGroup)}
            onClose={onClose}
            steps={[
              {
                name: 'success',
                component: <AddGroupSuccess onClose={onClose} />,
                isFinishedStep: true,
              },
            ]}
          />
        ) : null
      ) : (
        <FormRenderer
          schema={schema.current}
          container={container}
          subscription={{ values: true }}
          FormTemplate={FormTemplate}
          componentMapper={{ ...componentMapper, ...mapperExtension }}
          onSubmit={onSubmit}
          initialValues={groupData}
          onCancel={onCancel(
            redirectToGroups,
            () => {
              container.current.hidden = true;
              setWizardCanceled(true);
            },
            setGroupData
          )}
        />
      )}
    </AddGroupWizardContext.Provider>
  );
};

AddGroupWizard.propTypes = {
  postMethod: PropTypes.func,
  pagination: PropTypes.shape({
    limit: PropTypes.number.isRequired,
  }).isRequired,
  filters: PropTypes.object.isRequired,
  orderBy: PropTypes.string,
};

export default AddGroupWizard;
