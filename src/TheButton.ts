import { fileBackedObject } from "./FileBackedObject";
import { SharedSettings } from "./SharedSettings";
import CommandController from "./CommandController";
const { performance } = require('perf_hooks');

import Discord = require("discord.js");
import fs = require("fs");
import { contents } from "cheerio/lib/api/traversing";

interface ButtonData {
    messageId: Discord.Snowflake,
    presses: ButtonPresses[],
    additionalPresses: PressCount[]
}
interface PressCount {
    userId: Discord.Snowflake,
    count: number
}
interface ButtonPresses {
    userId: Discord.Snowflake,
    interactionId: Discord.Snowflake
}
export default class TheButton {
    private botty: Discord.Client;
    private buttonData: ButtonData;
    private sharedSettings: SharedSettings;
    private message: Discord.Message;

    public constructor(botty: Discord.Client, sharedSettings: SharedSettings) {
        if (!fs.existsSync("data/thebutton.json")) {
            fs.writeFileSync("data/thebutton.json", "{}");
        }
        this.botty = botty;
        this.buttonData = fileBackedObject<ButtonData>("data/thebutton.json");
        this.sharedSettings = sharedSettings;

        if (!this.buttonData.presses) this.buttonData.presses = [];
        if (!this.buttonData.additionalPresses) this.buttonData.additionalPresses = []
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
                if (message) this.message = message;
            }
            catch {
                message = false;
            }
            const messageInfo = await buttonChannel.send({
                components: [
                    new Discord.ActionRowBuilder<Discord.ButtonBuilder>().addComponents(new Discord.ButtonBuilder().setCustomId("the_button").setLabel("???").setStyle(Discord.ButtonStyle.Primary))
                ]
            } as Discord.MessageCreateOptions);
            this.buttonData.messageId = messageInfo.id;
            this.message = messageInfo;
        }
        catch (e) {
            console.error("Failed to initialize the button", e.stack);
        }
    }
    public async onInteraction(interaction: Discord.Interaction) {

        let inserted;
        if (!interaction.isButton()) return false;
        if (interaction.message.id !== this.buttonData.messageId) return false;

        interaction.deferReply({ephemeral: true});
        if (this.buttonData.presses.find((p => p.userId === interaction.user.id)) === undefined) {
            inserted = true;
            this.buttonData.presses.push({userId: interaction.user.id, interactionId: interaction.id})
        }
        try {
            // if (!inserted) return await interaction.reply({content: "<:429:344978692826726402>", ephemeral: true})
            if (!inserted) {
                const userPressInfo = this.buttonData.additionalPresses.find(u => u.userId === interaction.user.id)
                if (userPressInfo) {
                    userPressInfo.count++;
                    if (userPressInfo.count === 6) {
                        return await interaction.editReply({content: "7?",});
                    }
                    else if (userPressInfo.count === 67) {
                        return await interaction.editReply({content: "6-7"});
                    }
                    else if (userPressInfo.count === 69) {
                        return await interaction.editReply({content: "Nice"});
                    }
                }
                else {
                    this.buttonData.additionalPresses.push({userId: interaction.user.id, count: 1});
                }
            }
            const random = Math.random();

            if (random > 0.5 && this.message && this.message.editable) {
                await this.message.edit({
                components: [
                    new Discord.ActionRowBuilder<Discord.ButtonBuilder>().addComponents(new Discord.ButtonBuilder().setCustomId("the_button").setLabel(this.buttonData.presses.length.toString()).setStyle(Math.floor(Math.random()*4) + 1))
                ]
                } as Discord.MessageEditOptions)
            }
            else {
                await this.message.edit({
                components: [
                    new Discord.ActionRowBuilder<Discord.ButtonBuilder>().addComponents(new Discord.ButtonBuilder().setCustomId("the_button").setLabel("???").setStyle(Math.floor(Math.random()*4) + 1))
                ]
                } as Discord.MessageEditOptions)
            }
            // return await interaction.deferUpdate();
        }
        catch (e) {
            console.error(e, e.stack);
        }
    }
}