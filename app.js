const express = require("express");
const fetch = require("node-fetch");
const redis = require("redis");
const responseTime = require("response-time");
const { promisify } = require("util");

const app = express();
const PORT = process.env.PORT || 8000;
const REDIS_PORT = process.env.PORT || 6379;
app.use(responseTime());
const client = redis.createClient(REDIS_PORT);
const GET_CLIENT = promisify(client.get).bind(client);
const SET_CLIENT = promisify(client.setex).bind(client);

const getResponse = async (req, res) => {
  try {
    const { username } = req.params;

    const response = await fetch(`https://api.github.com/users/${username}`);
    const data = await response.json();

    if (!data || data.message)
      return res
        .status(400)
        .json({ message: data.message || "user not found" });

    //set to redis
    await SET_CLIENT(username, 3600, JSON.stringify(data?.public_repos));

    res.json(data.public_repos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const cacheMiddleware = async (req, res, next) => {
  const { username } = req.params;

  const data = await GET_CLIENT(username);

  if (data) return res.json(JSON.parse(data));
  next();
};

app.get("/:username", cacheMiddleware, getResponse);

app.listen(PORT, () => console.log(`server running on PORT - ${PORT}...`));
