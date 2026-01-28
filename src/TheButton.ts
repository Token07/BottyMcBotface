import { fileBackedObject } from "./FileBackedObject";
import { SharedSettings } from "./SharedSettings";
import CommandController from "./CommandController";
const { performance } = require('perf_hooks');

import Discord = require("discord.js");
import fs = require("fs");
import { contents } from "cheerio/lib/api/traversing";

interface ButtonData {
    messageId: Discord.Snowflake,
    presses: ButtonPresses[]
}
interface ButtonPresses {
    userId: Discord.Snowflake,
    interactionId: Discord.Snowflake
}
export default class TheButton {
    private botty: Discord.Client;
    private buttonData: ButtonData;
    private sharedSettings: SharedSettings;

    public constructor(botty: Discord.Client, sharedSettings: SharedSettings) {
        if (!fs.existsSync("data/thebutton.json")) {
            fs.writeFileSync("data/thebutton.json", "{}");
        }
        this.botty = botty;
        this.buttonData = fileBackedObject<ButtonData>("data/thebutton.json");
        this.sharedSettings = sharedSettings;

        if (!this.buttonData.presses) this.buttonData.presses = [];
        this.botty.on('ready', this.onReady.bind(this));
        this.botty.on('interactionCreate', this.onInteraction.bind(this));
    }

    public async onReady() {
        try {
            if (!this.sharedSettings.server.guildId) return false;

            const server = await this.botty.guilds.fetch(this.sharedSettings.server.guildId);
            if (!server) return false;
            const channels = await server.channels.fetch();
            const buttonChannel = channels.find(c => c && c.name === "the-button");
            if (!buttonChannel || !buttonChannel.isTextBased()) return false;
            let message;
            try {
                if (this.buttonData.messageId) message = await buttonChannel.messages.fetch(this.buttonData.messageId);
            }
            catch {
                message = false;
            }
            if (message) return true;
            const messageInfo = await buttonChannel.send({
                components: [
                    new Discord.ActionRowBuilder<Discord.ButtonBuilder>().addComponents(new Discord.ButtonBuilder().setCustomId("the_button").setLabel("???").setStyle(Discord.ButtonStyle.Primary))
                ]
            } as Discord.MessageCreateOptions);
            this.buttonData.messageId = messageInfo.id;
        }
        catch (e) {
            console.error("Failed to initialize the button", e.stack);
        }
    }
    public async onInteraction(interaction: Discord.Interaction) {
        let inserted;
        if (!interaction.isButton()) return false;
        if (interaction.message.id !== this.buttonData.messageId) return false;

        if (this.buttonData.presses.find((p => p.userId === interaction.user.id)) === undefined) {
            inserted = true;
            this.buttonData.presses.push({userId: interaction.user.id, interactionId: interaction.id})
        }
        try {
            if (!inserted) return await interaction.reply({content: "<:429:344978692826726402>", ephemeral: true})
            await interaction.deferUpdate();
        }
        catch (e) {
            console.error(e, e.stack);
        }
    }
}