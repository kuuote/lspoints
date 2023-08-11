import { concat } from "https://deno.land/std@0.196.0/bytes/concat.ts";
import { indexOfNeedle } from "https://deno.land/std@0.196.0/bytes/index_of_needle.ts";

const rn = new Uint8Array([0xd, 0xa]);
const decoder = new TextDecoder();

enum Mode {
  Header = 0,
  Content = 1,
}

export class JsonRpcStream extends TransformStream<Uint8Array, unknown> {
  #mode = Mode.Header;
  #contentLength = -1;
  #buf = new Uint8Array();

  constructor() {
    super({
      transform: (chunk, controller) => {
        this.#handle(chunk, controller);
      },
    });
  }

  #handle(
    chunk: Uint8Array,
    controller: TransformStreamDefaultController<unknown>,
  ) {
    this.#buf = concat(this.#buf, chunk);
    while (true) {
      if (this.#mode === Mode.Header) {
        while (true) {
          const found = indexOfNeedle(this.#buf, rn);
          if (found === -1) {
            return;
          }
          const headerRaw = this.#buf.subarray(0, found);
          this.#buf = this.#buf.subarray(found + 2);
          if (headerRaw.length === 0) {
            // terminal
            if (this.#contentLength === -1) {
              throw new Error("Content-Lengthが指定されてねーぞゴルァ");
            }
            this.#mode = Mode.Content;
            break;
          } else {
            const header = decoder.decode(headerRaw);
            const match = header.match(/Content-Length: (\d+)/);
            const length = Number(match?.[1]);
            if (!isNaN(length)) {
              this.#contentLength = length;
            }
          }
        }
      }
      if (this.#mode === Mode.Content) {
        if (this.#contentLength <= this.#buf.length) {
          const content = this.#buf.subarray(0, this.#contentLength);
          this.#buf = this.#buf.subarray(this.#contentLength);
          controller.enqueue(JSON.parse(decoder.decode(content)));
          this.#mode = Mode.Header;
        } else {
          return;
        }
      }
    }
  }
}
