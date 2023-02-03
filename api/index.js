const express = require("express");
const app = express();
const { search, ingest } = require('./services/data-access');
const port = 3000;

app.use(express.json({ limit: "2000mb" }));
app.use(express.urlencoded({ extended: false, limit: "2000mb" }));

app.listen(port, async () => {
  console.log(`ULI Service started! Listening on port ${port}...`);
});

app.get("/", (req, res) => {
  res.send({
    statusCode: 200,
    message: "It worked!!",
  });
});

app.post("/uli-service/v1/ingest/:providerUoi", async (req, res) => {
  try {
    const { body: data = [], params } = req;
    const { providerUoi } = params;

    if (!providerUoi?.length) {
      res.send({
        statusCode: 400,
        message: "Missing providerUoi in path!"
      });
    }

    if (!data?.length) {
      res.send({
        statusCode: 400,
        message: "Request body missing ULI array!"
      });
    }

    await ingest(providerUoi, data);

    res.send({
      statusCode: 200,
      message: `Items queued for ingest: ${data?.length || 0}`
    });

  } catch (err) {
    console.log(err);
    res.send({
      statusCode: 400,
      message: err
    });
  }

});

app.post("/uli-service/v1/search", async (req, res) => {
  
  try {
    res.send({
      statusCode: 200,
      body: await search()
    });

  } catch (err) {
    console.error(err);

    res.send({
      statusCode: 400,
      message: `Error! Message: ${err}`,
    });
  }
});
