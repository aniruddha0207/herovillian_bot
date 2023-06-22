import { Telegraf, Markup, session, Scenes } from "telegraf";
import dotenv from "dotenv";
import fs from "fs/promises";

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const stage = new Scenes.Stage();
bot.use(session());
bot.use(stage.middleware());
const userStates = {};

bot.use(stage.middleware());

async function search(name) {
  const token = process.env.ACCESS_TOKEN;
  const formattedName = name.replaceAll(" ", "_");
  const response = await fetch(
    `https://superheroapi.com/api/${token}/search/${formattedName}`
  );

  const data = await response.text();
  const formattedData = data
    .replace(/\\"/g, "")
    .replace(/\n/g, "")
    .replace(/\\/g, "");
  fs.writeFile("super.json", formattedData);
  return formattedData;
}

const searchHandler = new Scenes.WizardScene(
  "search-wizard",
  async (ctx) => {
    try {
      const chatId = ctx.chat.id;
      if (!userStates[chatId]) {
        userStates[chatId] = {};
      }
      userStates[chatId].lastMessage = await ctx.editMessageMedia({
        type: "photo",
        media:
          "AgACAgUAAxkBAANYZIriTeGvAbx3ON1RAd_hs-g9LgEAAmy_MRvV5VhU4q2X6NWaeJEBAAMCAANzAAMvBA",
        caption: `<b>⚠️Enter a Valid SuperHero or SuperVillian Name\n\n💠eg=<code>Ironman</code>\n             <code>Batman</code>\n             <code>Doctor Doom</code>\n             <code>spider-man</code></b>`,
        parse_mode: "HTML",
      });
      return ctx.wizard.next();
    } catch (error) {
      console.error(error);
    }
  },
  async (ctx) => {
    try {
      const chatId = ctx.chat.id;
      if (!userStates[chatId]) {
        userStates[chatId] = {};
      }
      userStates[chatId].input = ctx.message?.text;
      if (userStates[chatId].lastMessage) {
        await ctx.deleteMessage(userStates[chatId].lastMessage.message_id);
        try {
          const chatId = ctx.chat.id;
          if (!userStates[chatId]) {
            userStates[chatId] = {};
          }
          userStates[chatId].lastMessage = userStates[chatId].lastMessage =
            await ctx.replyWithPhoto(
              "AgACAgUAAxkBAANaZIriT-7sFoDTm2CyZbQX9gyEpEQAAmm_MRvV5VhUuSTIPryzm0QBAAMCAANzAAMvBA",
              {
                caption: `<b> ➡️ INPUT = ${userStates[chatId].input}\n\nCONFIRM ✅ OR CANCEL ❌ THE REQUEST?</b>`,
                parse_mode: "HTML",
                ...Markup.inlineKeyboard([
                  Markup.button.callback("CONFIRM✅", "confirm"),
                  Markup.button.callback("CANCEL❌", "cancel"),
                ]),
              }
            );
          return ctx.wizard.next();
        } catch (e) {
          console.error(e);
        }
      }
    } catch (error) {
      console.error(error);
    }
  },
  async (ctx) => {
    try {
      const chatId = ctx.chat.id;
      if (ctx.update.callback_query?.data === "confirm") {
        try {
          if (userStates[chatId].lastMessage) {
            await ctx.deleteMessage(userStates[chatId].lastMessage.message_id);
          }
          userStates[chatId].data = JSON.parse(
            await search(userStates[chatId].input)
          );
          if (userStates[chatId].data?.response === "success") {
            try {
              const buttons = userStates[chatId].data.results.map((result) =>
                Markup.button.callback(result.name, result.id)
              );
              const buttonRows = [];
              for (let i = 0; i < buttons.length; i += 3) {
                buttonRows.push(buttons.slice(i, i + 3));
              }

              userStates[chatId].lastMessage = await ctx.replyWithPhoto(
                "AgACAgUAAxkBAAIBx2SMTw5OqG1Y7qroveK4i7S9Sz0bAAIhtzEb1eVoVHFJyxR8Mwy3AQADAgADcwADLwQ",
                {
                  caption: "Select a character from below!",
                  ...Markup.inlineKeyboard(buttonRows),
                }
              );
              ctx.wizard.next();
            } catch (e) {
              console.error(e);
            }
          } else {
            ctx.scene.leave();
          }
        } catch (e) {
          console.error(e);
        }
      } else if (ctx.update.callback_query?.data === "cancel") {
        userStates[chatId].lastMessage = await ctx.editMessageMedia(
          {
            type: "photo",
            media:
              "AgACAgUAAxkBAANYZIriTeGvAbx3ON1RAd_hs-g9LgEAAmy_MRvV5VhU4q2X6NWaeJEBAAMCAANzAAMvBA",
            caption: `<b>💠INPUT HAS BEEN CANCELLED BY USER❌</b>`,
            parse_mode: "HTML",
          },
          Markup.inlineKeyboard([[Markup.button.callback("🔙BACK", "start")]])
        );
        ctx.scene.leave();
      }
    } catch (e) {
      console.error(e);
    }
  },
  async (ctx) => {
    try {
      const chatId = ctx.chat.id;
      if (userStates[chatId].lastMessage) {
        await ctx.deleteMessage(userStates[chatId].lastMessage.message_id);
      }
      userStates[chatId].button = ctx.callbackQuery.data;
      const character = userStates[chatId].data.results.find(
        (result) => result.id == userStates[chatId].button
      );

      if (character) {
        let details = `Biography:\n`;
        for (const [key, value] of Object.entries(character.biography)) {
          if (Array.isArray(value)) {
            details += `${key}: ${value.join(",")}\n`;
          } else {
            details += `${key}: ${value}\n`;
          }
        }
        details += `\nAppearance: ${character.appearance.gender},${
          character.appearance.race
        }\nHeight: ${character.appearance.height.join(
          ","
        )}\nWeight: ${character.appearance.weight.join(",")}\nEyeColor: ${
          character.appearance["eye-color"]
        }\nHairColor: ${character.appearance["hair-color"]}\n`;
        details += `Work: ${character.work.occupation}\nBase: ${character.work.base}\n\n`;
        details += `GroupAffiliation: ${character.connections["group-affiliation"]}`;
        // details +=`\n\nRelatives: ${character.connections.relatives}`

        userStates[chatId].lastMessage = await ctx.replyWithPhoto(
          character.image.url,
          {
            caption: `<b>${character.name}\n\n${details}</b>`,
            parse_mode: "HTML",
            ...Markup.inlineKeyboard([
              [Markup.button.callback("🔙BACK", "start")],
            ]),
          }
        );

        ctx.scene.leave();
      }
    } catch (e) {
      console.error(e);
    }
  }
);

stage.register(searchHandler);

bot.action(`search`, async (ctx) => {
  try {
    ctx.scene.leave();
    ctx.scene.enter("search-wizard");
  } catch (error) {
    console.error(error);
  }
});

bot.start(async (ctx) => {
  ctx.scene.leave();
  const chatId = ctx.chat.id;
  if (!userStates[chatId]) {
    userStates[chatId] = {};
  }
  userStates[chatId].lastMessage = await ctx.replyWithPhoto(
    "AgACAgUAAxkBAANcZIriUO1ZVV-UknVa_hK4NaUcdJEAAm2_MRvV5VhUajyGTiewuz8BAAMCAANzAAMvBA",
    {
      caption: "<b>Welcome to my bot!</b>",
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("SEARCH  🔍", "search")],
        [Markup.button.callback("ABOUT", "about")],
      ]),
    }
  );
});

bot.action("start", async (ctx) => {
  ctx.scene.leave();
  const chatId = ctx.chat.id;
  if (!userStates[chatId]) {
    userStates[chatId] = {};
  }
  userStates[chatId].lastMessage = await ctx.editMessageMedia(
    {
      type: "photo",
      media:
        "AgACAgUAAxkBAANcZIriUO1ZVV-UknVa_hK4NaUcdJEAAm2_MRvV5VhUajyGTiewuz8BAAMCAANzAAMvBA",
      caption:
        "<b>What can this bot do?\nThis bot can help you to find several superheroes and supervillains ever created in this universe. You can see their details such as Powerstats, Appearance, Biography, Image etc.\nOnce you have found your favourite superhero or supervillain don’t forget to share with your friends and other groups 😃.\nMade with ❤ by Arnab and Aniruddha.</b>",
      parse_mode: "HTML",
    },
    Markup.inlineKeyboard([
      [Markup.button.callback("SEARCH  🔍", "search")],
      [Markup.button.callback("ABOUT", "about")],
    ])
  );
});

bot.action("search", async (ctx) => {
  ctx.scene.leave();
  await ctx.deleteMessage(userStates[ctx.from.id].lastMessage.message_id);
  ctx.scene.enter("search");
});

bot.action("about", async (ctx) => {
  userStates[ctx.from.id].lastMessage = await ctx.editMessageMedia(
    {
      type: "photo",
      media:
        "AgACAgUAAxkBAAIB1WSMT9hxtBoKUH0O9tiZwSlqoQj2AAIktzEb1eVoVCCzO5aw0wwBAQADAgADcwADLwQ",
      caption:
        "<b>What can this bot do?\nThis bot can help you to find several superheroes and supervillains ever created in this universe. You can see their details such as Powerstats, Appearance, Biography, Image etc.\nOnce you have found your favourite superhero or supervillain don’t forget to share with your friends and other groups 😃.\nMade with ❤ by Arnab and Aniruddha.</b>",
      parse_mode: "HTML",
    },
    Markup.inlineKeyboard([[Markup.button.callback("🔙 BACK", "start")]])
  );
});

bot.launch();
