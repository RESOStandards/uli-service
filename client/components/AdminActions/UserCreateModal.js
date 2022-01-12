import React, { useState } from "react";
import Select from "react-select";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Radio, RadioGroup } from "@blueprintjs/core";

import { Button, Input, Modal, Toastr } from "components/common";
import { createUser } from "apis/user";

const metadataSchema = yup.object().shape({
  metadata: yup.object().shape({
    uoi: yup.string().optional(),
  }),
});

const schema = (isAdmin) => {
  return yup
    .object()
    .shape({
      username: yup
        .string()
        .matches(/^[a-zA-Z0-9]*$/g, "Invalid character")
        .required(),
      password: yup.string().min(4).max(256).required(),
      full_name: yup.string().required(),
      email: yup.string().email().required(),
    })
    .concat(isAdmin ? null : metadataSchema);
};

const userTypes = {
  normalUser: {
    label: "Normal User",
    value: "normalUser",
  },
  provider: {
    label: "Provider",
    value: "provider",
  },
};

const UserCreateModal = ({
  createTokenForUser,
  setShowUserCreateModal,
  updateUserList,
  setActiveUser,
  isAdmin = false,
  organizations,
}) => {
  const {
    register,
    handleSubmit,
    control,
    setError,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema(isAdmin)),
    mode: "onChange",
    reValidateMode: "onChange",
  });

  const [activeUserType, setActiveUserType] = useState(
    userTypes.normalUser.value
  );
  const metadata = watch("metadata");

  const submitForm = async (newUser) => {
    try {
      if (activeUserType === userTypes.provider.value && !metadata?.uoi) {
        setError("metadata.uoi", {
          type: "manual",
          message: "Organization is required",
        });
        return;
      }
      await createUser(newUser, isAdmin);
      if (isAdmin) {
        updateUserList();
      } else {
        createTokenForUser(newUser.username);
      }
      setShowUserCreateModal(false);
      setActiveUser(newUser);
      Toastr.success(`User ${newUser.full_name} created successfully`);
    } catch (error) {
      logger.error(
        "Error creating user => ",
        error?.response?.data?.message || error
      );
    }
  };

  return (
    <Modal onClose={() => setShowUserCreateModal(false)}>
      <div className="mx-20 py-5 flex justify-between items-center gap-5">
        <h2
          className="text-gray-800 flex-1 text-3xl font-semibold"
          data-test-id="create-user-heading"
        >
          Create User
        </h2>
        <div
          className="cursor-pointer flex justify-end"
          data-test-id="create-user-form-close-button"
          onClick={() => setShowUserCreateModal(false)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="24"
            height="24"
          >
            <path fill="none" d="M0 0h24v24H0z" />
            <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-11.414L9.172 7.757 7.757 9.172 10.586 12l-2.829 2.828 1.415 1.415L12 13.414l2.828 2.829 1.415-1.415L13.414 12l2.829-2.828-1.415-1.415L12 10.586z" />
          </svg>
        </div>
      </div>
      <div className="w-full flex flex-col items-center">
        <div className="w-3/4 flex flex-col mt-4">
          <form onSubmit={handleSubmit(submitForm)}>
            <Input
              placeholder="username"
              name="username"
              dataTestId="user-name-input"
              error={errors.username?.message}
              className="mb-2"
              {...register("username")}
            ></Input>
            <Input
              placeholder="password"
              name="password"
              type="password"
              error={errors.password?.message}
              className="mb-2"
              dataTestId="user-password-input"
              {...register("password")}
            ></Input>
            {!isAdmin && (
              <>
                <RadioGroup
                  onChange={(e) => setActiveUserType(e.currentTarget.value)}
                  selectedValue={activeUserType}
                  className="font-semibold"
                  inline={true}
                >
                  <Radio
                    label={userTypes.normalUser.label}
                    value={userTypes.normalUser.value}
                  />
                  <Radio
                    label={userTypes.provider.label}
                    value={userTypes.provider.value}
                  />
                </RadioGroup>
                {activeUserType === userTypes.provider.value && (
                  <Controller
                    name="metadata.uoi"
                    control={control}
                    rules={{ required: true }}
                    render={({ field: { onChange } }) => {
                      const customStyles = {
                        control: (base, state) => ({
                          ...base,
                          // state.isFocused can display different borderColor if you need it
                          borderColor: state.isFocused
                            ? "#ddd"
                            : !errors?.metadata?.uoi?.message
                              ? "#ddd"
                              : "red",
                          // overwrittes hover style
                          "&:hover": {
                            borderColor: state.isFocused
                              ? "#ddd"
                              : !errors?.metadata?.uoi?.message
                                ? "#ddd"
                                : "red",
                          },
                        }),
                      };
                      return (
                        <div className="mt-4 mb-1 h-14 box-border">
                          <Select
                            isLoading={!organizations.length}
                            isClearable={true}
                            isSearchable={true}
                            placeholder={"Select from organizations..."}
                            maxMenuHeight={150}
                            name="metadata.uoi"
                            styles={customStyles}
                            data-test-id="vendor-input"
                            theme={(theme) => ({
                              ...theme,
                              borderRadius: 5,
                              colors: {
                                ...theme.colors,
                                primary: "#93c5fd",
                              },
                            })}
                            options={organizations.filter((org) =>
                              org.value.match(/^[TMPC]/g)
                            )}
                            onChange={(selected) => onChange(selected?.value)}
                          />
                          {errors?.metadata?.uoi && (
                            <span className="text-sm text-red-500">
                              {errors?.metadata?.uoi?.message}
                            </span>
                          )}
                        </div>
                      );
                    }}
                  />
                )}
              </>
            )}
            <Input
              placeholder="full name"
              name="full_name"
              dataTestId="user-full-name-input"
              error={errors.full_name?.message}
              className="mb-2"
              {...register("full_name")}
            ></Input>
            <Input
              placeholder="email"
              name="email"
              dataTestId="user-email-input"
              className="mb-2"
              error={errors.email?.message}
              {...register("email")}
            ></Input>
            <Button
              type={"submit"}
              label="Save"
              fullWidth
              className="py-3 my-8 text-lg from-green-500 text-white"
              dataTestId="create-user-save-button"
            ></Button>
          </form>
        </div>
      </div>
    </Modal>
  );
};

export default UserCreateModal;
