const express = require("express");
const app = express();
const puppeteer = require("puppeteer");

const port = process.env.PORT || 4000;

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));

const getLinks = async (movieLink) => {
  try {
    // open browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    // open new tab and goto the link
    const page = await browser.newPage();
    await page.goto(movieLink, { waitUntil: "domcontentloaded", timeout: 0 });

    // get all the episodes links
    const episodeLinks = await page.$$eval(".all-episode > li", (list) => {
      return list.map((currentList) => currentList.children[0].href);
    });

    const finalLinks = await Promise.all(
      episodeLinks.map(async (episode) => {
        let newPage = await browser.newPage();
        await newPage.goto(episode, {
          waitUntil: "domcontentloaded",
          timeout: 0,
        });
        //   get the link
        const link = await newPage.$eval(
          "#frame_wrap > iframe",
          (iframe) => iframe.src,
        );
        // get the title
        const title = await newPage.$eval(
          ".watch-drama > h1",
          (h1) => h1.textContent,
        );

        return {
          link,
          title,
        };
      }),
    );
    await browser.close();
    if (finalLinks.length) return { status: true, data: finalLinks };
    return { message: "Link not Valid", status: false };
  } catch (err) {
    console.log(err.message);
  }
};

app.get("/", (req, res) => {
  res.render("index");
});

app.post("/", async (req, res) => {
  const link = req.body.link;
  const episodeLinks = await getLinks(link);
  res.render("index", { episodeLinks });
});

app.listen(port, () => console.log(`Server is listening on port ${port}`));
