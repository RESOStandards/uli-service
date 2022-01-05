const logger = require("logger");
const userService = require("services/user");

const createUser = async (req, res) => {
  try {
    const { Authorization } = req.headers;
    let {
      newUser: { username, password, full_name, email, metadata = {} },
      isAdmin,
    } = req.body;
    username = username.toLowerCase().trim();
    const existingUser = await userService.findUser(username, {
      Authorization,
    });
    if (existingUser) {
      throw new Error(`Username ${username} already exists`);
    }
    const userInfo = await userService.createOrUpdateUser(
      {
        username,
        userInfo: {
          password,
          full_name,
          email,
          metadata,
        },
        update: false,
        isAdmin,
      },
      { Authorization }
    );
    return res.send({
      isUserCreated: userInfo.isUserCreated,
      isUserUpdated: !userInfo.isUserCreated,
    });
  } catch (error) {
    logger.error("User Create Controller API:" + JSON.stringify(error));
    return res
      .status(error?.response?.status || 500)
      .send({ message: error.message || error });
  }
};

const listUsers = async (req, res) => {
  try {
    const { Authorization } = req.headers;
    const users = await userService.listUsers({ Authorization });
    return res.send(users);
  } catch (error) {
    logger.error("List api keys Controller API: ", error);
    return res.status(error?.response?.status || 400).send(error);
  }
};

const deleteUser = async (req, res) => {
  try {
    const { Authorization } = req.headers;
    const { username } = req.body;
    const users = await userService.deleteUser(username, { Authorization });
    return res.send(users);
  } catch (error) {
    logger.error("Delete User Controller API: ", error);
    return res.status(error?.response?.status || 400).send(error);
  }
};

module.exports = {
  createUser,
  deleteUser,
  listUsers,
};
