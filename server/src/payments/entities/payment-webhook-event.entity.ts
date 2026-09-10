import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
} from 'typeorm';

@Entity('payment_webhook_events')
@Unique(['event_id'])
export class PaymentWebhookEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  event_id!: string;

  @Column({ type: 'varchar', length: 100 })
  event_type!: string;

  @Column({ type: 'jsonb', nullable: true })
  payload?: any;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  processed_at!: Date;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;
}
