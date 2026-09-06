import { redisConnection } from "../config/redis.js";

export async function getNextSenderSlot(
  senderEmail: string,
  scheduledAt: number,
  customDelayMs?: number,
  customHourlyLimit?: number,
): Promise<{
  allowedAt: number;
  rateLimited: boolean;
}> {
  const delay = customDelayMs ?? Number(process.env.MIN_SEND_DELAY_MS || 2000);

  const limit =
    customHourlyLimit ?? Number(process.env.HOURLY_SEND_LIMIT || 200);

  const key = `rate-limit:${senderEmail}`;

  const script = `
    local key = KEYS[1]

    local requested = tonumber(ARGV[1])
    local delay = tonumber(ARGV[2])
    local limit = tonumber(ARGV[3])

    redis.call(
      "ZREMRANGEBYSCORE",
      key,
      0,
      requested - 3600000
    )

    local slots = redis.call(
      "ZRANGE",
      key,
      0,
      -1,
      "WITHSCORES"
    )

    local slot = requested
    local count = #slots / 2
    local rateLimited = 0

    if count >= limit then
      local oldest = tonumber(slots[2])

      slot = math.max(
        slot,
        oldest + 3600000
      )

      rateLimited = 1
    end

    if #slots > 0 then
      local last = tonumber(slots[#slots])

      slot = math.max(
        slot,
        last + delay
      )
    end

    local member =
      tostring(slot) .. "-" ..
      tostring(redis.call("INCR", key .. ":sequence"))

    redis.call(
      "ZADD",
      key,
      slot,
      member
    )

    redis.call(
      "EXPIRE",
      key,
      7200
    )

    return {slot, rateLimited}
  `;

  const result = await redisConnection.eval(
    script,
    1,
    key,
    scheduledAt,
    delay,
    limit,
  );

  const values = result as [number, number];

  return {
    allowedAt: Number(values[0]),
    rateLimited: Number(values[1]) === 1,
  };
}
