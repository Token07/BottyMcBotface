import { fileBackedObject } from "./FileBackedObject";
import { SharedSettings } from "./SharedSettings";
import CommandController from "./CommandController";
const { performance } = require('perf_hooks');

import Discord = require("discord.js");
import fs = require("fs");
import { contents } from "cheerio/lib/api/traversing";
import { ButtonBuilder, TextInputBuilder } from "@discordjs/builders";
import { ButtonStyle } from "discord.js";

interface ButtonData {
    messageId: Discord.Snowflake,
    presses: ButtonPresses[],
    additionalPresses: PressCount[]
}
interface PressCount {
    userId: Discord.Snowflake,
    count: number,
    riddleAnswered?: boolean;
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
                return;
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
        if (interaction.isModalSubmit() && interaction.customId === "riddleModal") return await this.onRiddleAnswerSubmit(interaction);
        if (!interaction.isButton()) return false;
        if (interaction.customId === "riddle") return await this.onRiddleAnswerButton(interaction);
        if (interaction.message.id !== this.buttonData.messageId) return false;

        if (this.buttonData.presses.find((p => p.userId === interaction.user.id)) === undefined) {
            inserted = true;
            this.buttonData.presses.push({userId: interaction.user.id, interactionId: interaction.id})
        }
        try {
            // if (!inserted) return await interaction.reply({content: "<:429:344978692826726402>", ephemeral: true})
            const userPressInfo = this.buttonData.additionalPresses.find(u => u.userId === interaction.user.id);
            if (!inserted) {
                if (userPressInfo) {
                    userPressInfo.count++;
                    if (userPressInfo.count === 6) {
                        return await interaction.reply({content: "7?", ephemeral: true});
                    }
                    else if (userPressInfo.count === 67) {
                        return await interaction.reply({content: "6-7", ephemeral: true});
                    }
                    else if (userPressInfo.count === 69) {
                        return await interaction.reply({content: "Nice", ephemeral: true});
                    }
                    else if (userPressInfo.count > 15 && !userPressInfo.riddleAnswered) {
                        const riddle = "You come across a printout of what appears to be a blog post, but it's in rough shape. The text is smudged and torn in places. From what you can make out, it seems to be about an old-school experience (but nothing to do with that MMO written in Java), and you can barely read some of the names on the winners list. Several of the names you can make out appear to end in NA. Further down in the smudged text you barely make out the word \"travel.\"\n\nSupringly, the URL at the bottom of the paper is mostly intact. The end of the path is missing, but you're no fool and can figure it out. What are the characters after the last `/`?";
                        return await interaction.reply({
                            content: riddle,
                            components: [
                                new Discord.ActionRowBuilder<ButtonBuilder>()
                                    .addComponents(
                                        new ButtonBuilder()
                                            .setCustomId("riddle")
                                            .setStyle(ButtonStyle.Primary)
                                            .setLabel("Answer")
                                        )
                            ],
                            ephemeral: true
                        });
                    }
                    if (userPressInfo.riddleAnswered) {
                        return await interaction.reply({content: "You press the button again and hear Silver Scrapes playing in the distance.\nhttps://www.youtube.com/watch?v=Thjagcdo4Bw", ephemeral: true});
                    }
                }
                else {
                    this.buttonData.additionalPresses.push({userId: interaction.user.id, count: 1});
                }
            }
            const random = Math.random();

            return await interaction.reply({content: "You pressed the button. Nothing seems to have changed, or did it?", ephemeral: true});
        }
        catch (e) {
            console.error(e, e.stack);
        }
    }
    private async onRiddleAnswerButton(interaction: Discord.Interaction) {
        if (!interaction.isButton()) return;
        const modal = new Discord.ModalBuilder()
            .setCustomId('riddleModal')
            .setTitle('Riddle Challenge');

        const answerInput = new Discord.TextInputBuilder()
            .setCustomId('riddleAnswer')
            .setLabel("What are the last few characters?")
            .setStyle(Discord.TextInputStyle.Short)
            .setPlaceholder('Type your answer here...')
            .setRequired(true);

        const row = new Discord.ActionRowBuilder<TextInputBuilder>().addComponents(answerInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
    }
    private async onRiddleAnswerSubmit(interaction: Discord.Interaction) {
        if (!interaction.isModalSubmit()) return;
        if (interaction.customId !== 'riddleModal') return;

        const userAnswer = interaction.fields.getTextInputValue('riddleAnswer');

        if (userAnswer.toLowerCase() === 'af-recap') {
            const userPressInfo = this.buttonData.additionalPresses.find(u => u.userId === interaction.user.id);
            userPressInfo!.riddleAnswered = true;
            const prizeRole = await interaction.guild?.roles.cache.get("1466597661699346535");
            if (prizeRole && interaction.guild) {
                try {
                    const member = interaction.guild.members.cache.get(interaction.user.id);
                    if (member) {
                        await member.roles.add(prizeRole);
                        await interaction.reply({ content: 'You solved the mystery and gained a role!', ephemeral: true });
                    }
                }
                catch (e) {
                    await interaction.reply({ content: 'Correct, but unfortunately the prize machine broke. @ Jacob in off-topic to claim your prize', ephemeral: true });
                    console.error(e, e.stack);
                }
            }
            else {
                await interaction.reply({ content: 'Correct, but either you answered in a DM or the prize machine broke.', ephemeral: true });
            }
        }
        else {
            const hint = "You type the URL in your browser and it responds with `404 - Not Found.`\nYou walk around a bit and stumble across another printout of a post from a different blog. This one is in slightly better shape and reads more like a technical deep dive, though the page layout looks a little dated. You can make out mentions of encryption and salts. Towards the end, you spot a reference to the blog post from the first printout. This can't be coincidence, could it?";
            await interaction.reply({ content: hint, ephemeral: true });
        }
    }
}