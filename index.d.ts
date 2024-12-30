import { Writable, WritableOptions } from "stream";
import {
  PutObjectCommandInput,
  PutObjectCommandOutput,
} from "@aws-sdk/client-s3";

export interface S3StreamLoggerOptions extends WritableOptions {
  bucket?: string;
  folder?: string;
  tags?: Record<string, string>;
  name_format?: string;
  rotate_every?: number;
  max_file_size?: number;
  upload_every?: number;
  buffer_size?: number;
  server_side_encryption?: boolean;
  acl?: string;
  compress?: boolean;
  storage_class?: string;
  region?: string;
  access_key_id?: string;
  secret_access_key?: string;
  config?: {
    region?: string;
    sslEnabled?: boolean;
    credentials?: {
      accessKeyId?: string;
      secretAccessKey?: string;
    };
  };
}

export declare class S3StreamLogger extends Writable {
  constructor(options: S3StreamLoggerOptions);

  flushFile(cb?: (err: Error | null) => void): void;

  putObject(
    param: PutObjectCommandInput,
    callback: (err: Error | null, data?: PutObjectCommandOutput) => void
  ): void;

  private _upload(
    forceNewFile: boolean,
    cb?: (err: Error | null, data?: PutObjectCommandOutput) => void
  ): void;
  private _prepareBuffer(
    cb: (err: Error | null, buffer?: Buffer) => void
  ): void;
  private _fileSize(): number;
  private _newFile(): void;
  private _restoreUnwritten(
    unwritten: number,
    objectName: string | null,
    buffers: Buffer[] | undefined
  ): void;

  public _write(
    chunk: Buffer | string,
    encoding: string,
    callback: (err?: Error | null) => void
  ): void;

  public _final(cb?: (err?: Error | null) => void): void;
}

export default S3StreamLogger;
