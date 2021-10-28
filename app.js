const express = require("express");
const fetch = require("node-fetch");
const redis = require("redis");

const app = express();
const PORT = process.env.PORT || 8000;
const REDIS_PORT = process.env.PORT || 6379;

const client = redis.createClient(REDIS_PORT);

const getResponse = async (req, res) => {
  try {
    const { username } = req.params;

    const response = await fetch(`https://api.github.com/users/${username}`);
    const data = await response.json();

    //set to redis
    client.setex(username, 3600, JSON.stringify(data?.public_repos));

    res.json(data.public_repos);
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ message: err.message });
  }
};

const cacheMiddleware = (req, res, next) => {
  const { username } = req.params;

  client.get(username, (error, data) => {
    if (error) return next(error);

    if (data !== null) return res.json(JSON.parse(data));

    next();
  });
};

app.get("/:username", cacheMiddleware, getResponse);

app.listen(PORT, () => console.log(`server running on PORT - ${PORT}...`));
