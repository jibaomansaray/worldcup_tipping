import { AppDataSource, env } from "../data-source"
import * as bcrypt from 'bcrypt'
import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'crypto'
import { User, UserRole, UserType } from "../entity/User";
import { CookieOptions, Request, Response } from "express";
import { toPng } from 'jdenticon'
import * as fs from 'fs/promises'
import * as path from 'path'

export const getUserRepo = () => {
  return AppDataSource.getRepository(User);
}

export const pluckUserFromRequest = (req: Request) => {
  return (req as unknown as { authUser: User }).authUser;
}

export const hashPassword = async (rawPassword: string) => {
  return bcrypt.hash(rawPassword, 10);
}

export const checkPassword = async (user: User, rawPassword: string) => {
  const result = await bcrypt.compare(rawPassword, user.password);
  if (result) {
    return user;
  }
  return false;
}

export const generateAuthCookie = (user: User) => {

  const key = getEncryptionKey()
  const iv = createHash('sha256').update(randomBytes(16).toString('hex')).digest().subarray(0, 16)
  const encrypt = createCipheriv('aes256', key, iv)

  const encrypting = `${user.token}|${user.role}`
  const value = [encrypt.update(encrypting, 'utf-8', 'hex')]

  value.push(encrypt.final('hex'))

  const data = JSON.stringify({
    hash: iv.toString('base64'),
    value: value.join('')
  })

  return Buffer.from(data, 'utf-8').toString('base64url')

}

export const generateToken = () => {
  return randomBytes(32).toString('hex')
}

export const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw Error('Encryption key is required')
  }

  return createHash('sha256').update(key).digest()
}

export const authenticate = async (user: bigint | User, password: string, roleInternalId = '') => {
  const theUser = (typeof user === 'number') ? await getUserRepo().findOneByOrFail({
    id: user
  }) : user;
  return (theUser && await checkPassword(theUser as User, password)) || false
}


export const authenticateToken = async (rawToken: string, roleInternalId = '') => {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOneBy({
    token: rawToken
  });
  return user || false
}

export const authenticateAuthCookie = async (token: string) => {
  const key = getEncryptionKey()
  const data = JSON.parse(Buffer.from(token, 'base64url').toString('utf-8'))
  const iv = Buffer.from(data.hash, 'base64')
  const decrypt = createDecipheriv('aes256', key, iv)
  const value = [decrypt.update(data.value, 'hex', 'utf-8')]

  value.push(decrypt.final('utf-8'))
  const rawData = value.join('').split('|')
  const userToken = rawData[0]
  // const activeRole = rawData[1] // not in use

  return authenticateToken(userToken);
}

export const getUserById = async (userId: number) => {
  return await getUserRepo().findOneBy({ id: userId })
}

export const getUserByEmail = async (email: string) => {
  return await getUserRepo().findOneBy({ email })
}

export const createUser = async (username: string, email: string, password: string) => {
  const user = new User()

  user.email = email
  user.username = username
  user.password = password

  return await getUserRepo().save(user)
}

export const updateUser = async (userId: number, data: Record<string, unknown>) => {
  const user = await getUserById(userId);

  if (user) {
    if (data.username) {
      const username = data.username as string
      const oldUser = await getUserRepo().findOneBy({ username })
      if (oldUser && oldUser.id != user.id) {
        return {
          success: false,
          code: 'user_name_taken',
          message: 'User name already taken'
        }
      }
      user.username = data.username as string;
    }

    if (data.email) {
      const email = data.email as string
      const oldUser = await getUserRepo().findOneBy({ email })
      if (oldUser && oldUser.id != user.id) {
        return {
          success: false,
          code: 'user_email_not_valid',
          message: 'New email is not value.'
        }
      }
      user.email = email;
    }

    if (data.password) {
      const password = data.password as string;
      user.password = await hashPassword(password);
      user.token = generateToken();
    }

    return {
      success: true,
      user: await getUserRepo().save(user)
    }
  }

  return {
    success: false,
    code: 'user_not_found',
    message: 'Could not find this user'
  }
}

export const deleteUserAccount = async (userId: number) => {
  return await getUserRepo().delete(userId);
}

export const cleanUsernameForAvatar = (name: string) => {
  return name.split(' ').join('').toLocaleLowerCase()
}

export const generateAvatar = async (value: string) => {
  const size = 200;
  const png = toPng(value, size)
  const fileName = cleanUsernameForAvatar(value) + '.png'
  await fs.writeFile(path.join(path.basename(path.dirname(__dirname)), 'public', 'user', fileName), png)
  return fileName
}

export const cleanUserData = (user: User, additional: string[] = []) => {
  delete user.email;
  delete user.token;
  delete user.password;
  delete user.role;
  delete user.data;

  additional.forEach((a) => {
    delete user[a]
  })

  return user;
}

export const whenUserIsAdmin = async (req: Request, res: Response, callback: Function) => {
  const user = pluckUserFromRequest(req)
  if (user.role !== UserRole.ADMIN) {
    return {
      success: false,
      code: 'permission_denied',
      message: 'You do not have the right permission'
    }
  } else {
    return await callback()
  }
}

export const getUsersStream = async () => {
  return await getUserRepo().createQueryBuilder('user')
    .where('deletedAt is null')
    .where('type = :type', { type: UserType.HUMAN })
    .stream()
}

export const sendLoginResonse = (res: Response, user: User) => {
  const cookieOptions: CookieOptions = {
    sameSite: 'none',
    secure: true,
    signed: true
  }

  const cookie = generateAuthCookie(user);
  res.cookie('_t', cookie, cookieOptions)
    .cookie('_vapid', env('VAPID_PUBLIC_KEY'), cookieOptions)
    .json({
      success: true,
      user: {
        id: user.id,
        internalId: user.internalId,
        token: user.token,
        role: user.role,
        username: user.username,
        avatar: user.avatar
      },
      pushVapid: env('VAPID_PUBLIC_KEY')
    });
}