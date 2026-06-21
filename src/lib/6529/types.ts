export type JsonRecord = Record<string, unknown>;

export type WaveIdentity = {
  handle?: string | null;
  display?: string | null;
  pfp?: string | null;
  primary_wallet?: string | null;
};

export type WaveDrop = {
  id: string;
  serial_no?: number;
  created_at?: number;
  updated_at?: number;
  title?: string | null;
  content?: string | null;
  author?: WaveIdentity | null;
  drop_type?: string;
  poll?: JsonRecord | null;
  reactions?: JsonRecord[];
  source_wave_id?: string;
  source_wave_name?: string | null;
  source_wave_role?: string | null;
  parts?: Array<{
    id?: string;
    content: string;
  }>;
  raw?: JsonRecord;
};

export type WaveDropsResponse = {
  wave?: JsonRecord | null;
  drops: WaveDrop[];
  root_drop?: WaveDrop;
  trace?: JsonRecord[];
  raw?: JsonRecord;
};

export type DropPollRequest = {
  options: string[];
  multichoice: boolean;
  anonymous?: boolean;
  closing_time: number;
};

export type PostDropOptions = {
  replyToDropId?: string;
  poll?: DropPollRequest;
  dropType?: "CHAT" | "PARTICIPATORY" | "WINNER";
};
