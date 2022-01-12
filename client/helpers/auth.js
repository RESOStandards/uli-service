export const persistAuthInfo = ({
  token,
  isAdmin,
  username,
  uoi,
  email,
  fullName,
}) => {
  localStorage.setItem("token", token || "");
  localStorage.setItem("isAdmin", isAdmin);
  localStorage.setItem("username", username || "");
  localStorage.setItem("uoi", uoi || "");
  localStorage.setItem("email", email || "");
  localStorage.setItem("fullName", fullName || "");
};
export const getAuthInfo = () => ({
  token: localStorage.getItem("token"),
  isAdmin: localStorage.getItem("isAdmin"),
  username: localStorage.getItem("username"),
  uoi: localStorage.getItem("uoi"),
  email: localStorage.getItem("email"),
  fullName: localStorage.getItem("fullName"),
});

export const removeAuthInfo = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("isAdmin");
  localStorage.removeItem("username");
  localStorage.removeItem("uoi");
  localStorage.removeItem("email");
  localStorage.removeItem("fullName");
};
