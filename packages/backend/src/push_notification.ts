import { env } from './data-source'
import * as webPush from "web-push"
import { getUserById, getUsersStream } from './service/user_service';
import { User } from './entity/User';
import { queueNotification } from './jobs/process_chat_data';

let setupSuccessfully = false;

const USER_SUBSCRIPTION_DATA_KEY = 'push_subscription';

type Payload = { title: string, body: string, icon?: string, options?: { body: string, title: string, icon?: string } }

export const setupPushNotification = () => {
  const vapidPublicKey = env('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = env('VAPID_PRIVATE_KEY');
  const vapidSubject = env('VAPID_SUBJECT');
  if (vapidPublicKey && vapidPrivateKey && vapidSubject) {
    webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    setupSuccessfully = true;
  }
}

export const subscribeToNotification = (user: User, subscription: Record<string, unknown>) => {
  return user.setData(USER_SUBSCRIPTION_DATA_KEY, subscription);
}

export const unsubscribeToNotification = (user: User) => {
  return user.removeData(USER_SUBSCRIPTION_DATA_KEY);
}

export const getSubscription = (user: User) => {
  return user.getData(USER_SUBSCRIPTION_DATA_KEY);
}

export const sendNotification = async (payload: Payload, userOrId: User | number = 0, viaWebsocket = false) => {
  if (userOrId) {
    const user = (typeof userOrId === 'object') ? userOrId : await getUserById(userOrId)
    if (user) {
      const subscription = getSubscription(user)
      if (!subscription) {
        return false;
      }

      if (['production', 'prod'].indexOf(env('ENV', 'development')) === -1) {
        console.table({
          ...payload,
          userId: user.id
        });

        return false; // we are not in production mode
      }

      try {
        if (viaWebsocket) {
          queueNotification(payload)
        } else {
          return await webPush.sendNotification(subscription as webPush.PushSubscription, JSON.stringify(payload))
        }
      } catch (e) {
        return true
      }
    }
  } else {
    const stream = await getUsersStream()
    stream.on('data', async (data) => {
      const d = JSON.parse(JSON.stringify(data));
      sendNotification(payload, d.user_id, viaWebsocket);
    })
  }
  return true
}

