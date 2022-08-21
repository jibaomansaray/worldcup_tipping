import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ChatMessage } from "./ChatMessage";
import { UserChatRoom } from "./UserChatRoom";

export enum ChatRoomType {
  ONE_TO_ONE = 'one2one',
  PUBLIC = 'public'
}

@Entity()
export class ChatRoom {

  @PrimaryGeneratedColumn()
  id: number

  @Column({
    length: 255,
    unique: true
  })
  name: string

  @Column({
    type: 'enum',
    enum: ChatRoomType,
    default: ChatRoomType.PUBLIC
  })
  type: ChatRoomType

  @OneToMany(() => UserChatRoom, (member) => member.room)
  members: UserChatRoom[]

  @OneToMany(() => ChatMessage, (message) => message.room)
  messages: ChatMessage[]
}