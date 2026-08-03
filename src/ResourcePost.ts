import Info from "./Info";
import { SharedSettings } from "./SharedSettings";
import joinArguments from "./JoinArguments";
import Discord = require("discord.js");
import { fileBackedObject } from "./FileBackedObject";
import * as fs from 'node:fs';

interface Resource {
    guildId: Discord.Snowflake
    channelId: Discord.Snowflake
    messageId: Discord.Snowflake
    notesUsed: string[]
    body: string
}

export default class ResourcePost {
    private adminchannel: Discord.GuildBasedChannel | undefined;
    private bot: Discord.Client;
    private info: Info;
    private resourceList: Resource[];

    constructor(bot: Discord.Client, sharedSettings: SharedSettings, info: Info, dataFile: string) {
        this.bot = bot;
        this.info = info;

        if (!fs.existsSync(dataFile)) { fs.writeFileSync(dataFile, JSON.stringify([])); }
        this.resourceList = fileBackedObject(dataFile);

        this.fetchAdminChannel(sharedSettings);
    }
    private async fetchAdminChannel(sharedSettings: SharedSettings) {
        if (!this.bot.readyAt)
            return this.bot.once('clientReady', () => { this.fetchAdminChannel.bind(this, sharedSettings) })
        this.adminchannel = await (await this.bot.guilds.fetch(sharedSettings.server.guildId)).channels?.cache.find(c => c.name === sharedSettings.server.guruChannel);
    }
    public async onResourceAdd(channel: Discord.Channel, body: string) {
        if (!channel.isSendable() || !channel.isTextBased() || channel.isDMBased()) {
            return console.error("ResourcePost: Request to add a resource post to a channel but it's not sendable?");
        }
        try {
            const [notesUsed, text] = this.parse(body); 
            const message = await channel.send(text);

            this.resourceList.push({
                guildId: message.guildId,
                channelId: message.channelId,
                messageId: message.id,
                notesUsed,
                body: body
            });
        }
        catch (e) {
            throw(e);
        }

        return true;
    }
    public async onResourcePostEdit(newBody: string, message: Discord.Message<true>, triggedByMessage?: Discord.Message<true>) {
        if (!message.editable) {
            throw new Error("Message is not editable");
        }
        const resourceEntry = this.resourceList.find(entry => entry.messageId == message.id);
        const [notesUsed, text] = this.parse(newBody);
        resourceEntry!.notesUsed = notesUsed;
        resourceEntry!.body = newBody;
        if (newBody.length > 2000) return false;
        await message.edit(text);
        return true;
    }
    public parse(resourceBody: string): [string[], string] {
        const regex = /\{\{([^}]+)\}\}/g;
        const matches = [...resourceBody.matchAll(regex)];

        if (matches.length === 0) return [[], resourceBody];

        let parsedBody = resourceBody;

        for (const match of matches) {
            const [fullMatch, noteName] = match;
            const infoText = this.info.fetchInfo(noteName, true);
            parsedBody = parsedBody.replace(fullMatch,(infoText && infoText.message + "\n") ?? `[Error: Couldn't fetch ${fullMatch}]\n`);
        }
        return [matches.map(match => match[1].trim()), parsedBody];
    }
    public async onNoteEdit(name: string) {
        const resourcesToUpdate = this.resourceList.filter(post => post.notesUsed.findIndex(k => k === name) !== -1);

        for (const resource of resourcesToUpdate) {
            const guild = this.bot.guilds.cache.get(resource.guildId);
            const channel = guild?.channels.cache.get(resource.channelId);
            if (!channel?.isSendable() || !channel.isTextBased()) { continue; } // Idek
            const message = await channel?.messages.fetch(resource.messageId);
            this.onResourcePostEdit(resource.body, message);
        }
    }

    public async onResourcePostCommand(message: Discord.Message<true>, isAdmin: boolean, command: string, args: string[]) {
        if (!isAdmin) return false;
        let body;
        switch (args[0]) {
            case "add":
                body = message.content.substring(message.content.indexOf("add")+4);
                this.onResourceAdd(message.channel, body);
                if (!this.adminchannel?.isSendable()) return false;
                this.adminchannel.send(`<@${message.author.id}, posted new resource`);
                message.deletable ? message.delete() : void(0);
                break;
            case "edit":
                const resourceId = args[1];
                const resource = this.resourceList.find(r => r.messageId == resourceId);

                if (!resource) {
                    if (!this.adminchannel?.isSendable()) return false;
                    return this.adminchannel.send(`<@${message.author.id}, could not find resource with id ${resourceId}`);
                }
                body = message.content.substring(message.content.indexOf(resourceId)+resourceId.length+1);
                const resourceChannel = await (await this.bot.guilds.fetch(resource.guildId))?.channels.fetch(resource.channelId);
                if (resourceChannel && resourceChannel.isTextBased() && !resourceChannel.isDMBased()) {
                    const resourceMessage = await resourceChannel.messages.fetch(resource.messageId);
                    this.onResourcePostEdit(body, resourceMessage, message);
                    return;
                }
                break;
        }
    }
}