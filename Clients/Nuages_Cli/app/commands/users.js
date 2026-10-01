const { Command } = require('commander');

function roleValue(value) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.toLowerCase();
  if (normalized !== 'admin' && normalized !== 'user') {
    throw new Error('Role must be admin or user');
  }

  return normalized === 'admin';
}

async function findUserByUsername(username) {
  const result = await nuages.userService.find({ query: { username, $limit: 2 } });
  const users = result.data || result;
  if (users.length === 0) {
    throw new Error(`User not found: ${username}`);
  }
  if (users.length > 1) {
    throw new Error(`Multiple users found with username: ${username}`);
  }

  return users[0];
}

exports.users = new Command()
  .name('!users')
  .arguments('[username]')
  .exitOverride()
  .description('Manage users (administrator only)')
  .option('-c, --create <username>', 'Create a user')
  .option('-p, --password <password>', 'Set a password when creating or updating a user')
  .option('--role <admin|user>', 'Set the user role')
  .option('-r, --remove', 'Delete a user')
  .action(async function (username, cmdObj) {
    try {
      const isAdmin = roleValue(cmdObj.role);

      if (cmdObj.create) {
        if (!cmdObj.password) {
          nuages.term.logError('A password is required when creating a user');
          return;
        }

        await nuages.userService.create({
          username: cmdObj.create,
          password: cmdObj.password,
          isAdmin: isAdmin === true
        });
        nuages.term.logSuccess(`Created user ${cmdObj.create}`);
        return;
      }

      if (username && cmdObj.remove) {
        const user = await findUserByUsername(username);
        await nuages.userService.remove(user._id);
        nuages.term.logSuccess(`Deleted user ${username}`);
        return;
      }

      if (username) {
        const user = await findUserByUsername(username);
        const data = {};
        if (cmdObj.password) {
          data.password = cmdObj.password;
        }
        if (isAdmin !== undefined) {
          data.isAdmin = isAdmin;
        }
        if (Object.keys(data).length === 0) {
          nuages.term.logError('Provide --password, --role, or --remove');
          return;
        }

        await nuages.userService.patch(user._id, data);
        nuages.term.logSuccess(`Updated user ${username}`);
        return;
      }

      const result = await nuages.userService.find({ query: { $sort: { username: 1 } } });
      const users = result.data || result;
      nuages.term.writeln(`\r\n${nuages.toTable(nuages.templates.users, users)}`);
    } catch (err) {
      nuages.term.logError(err.message);
    }
  });