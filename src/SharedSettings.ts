export interface PersonalSettings {
    forum: {
        username: string;
        password: string;
    };

    discord: {
        key: string,
        owner: number;
    };
    riotApi: {
        key: string;
    };
    webServer: {
        relativeFolderLocation: string;
        relativeLiveLocation: string;
    };
    github: {
        username: string;
        password: string;
    };

    isProduction: boolean;
    appName: string;
}

export enum PageType {
    Page = "page",
    Article = "article",
}

export interface PageDifferPage {
    name: string;
    ident: string;
    type: PageType;
}

interface IntroLine {
    id: string;
    lineTranslation: { [lang: string]: string };
    type: "rule" | "intro";
}

export interface SharedSettings {
    server: {
        guildId: string;
        guruChannel: string;
        guruLogChannel: string;
        introChannel: string;
    };

    botty: PersonalSettings;

    lookup: {
        refreshTimeout: number;
        championUrl: string;
        skinUrl: string;
        perkUrl: string;
        itemUrl: string;
        summonerSpellUrl: string;
        confidence: number;
        maxGuessCount: number;
    };

    admin: {
        muteRoleId: string;
        muteRoleName: string;
        muteTimeout: number;
        keepAdminCommandsChannels: string[];
    };

    esports: {
        printChannel: string;
        updateTimeout: number;
        printToChannelTimeout: number;
    };

    commands: {
        default_prefix: string,
        adminRoles: string[];
    };

    techBlog: {
        checkInterval: number,
        channel: string,
        url: string,
    };

    keyFinder: {
        reportChannel: string,
    };

    forum: {
        checkInterval: number,
        channel: string,
        url: string,
    };

    pageDiffer: {
        checkInterval: number,
        channel: string,
        pages: PageDifferPage[],
        articleHost: string,
        embedImageUrl: string,
    };

    autoReact: {
        emoji: string,
    };

    info: {
        allowedRoles: string[],
        command: string,
        maxScore: number,
        maxListeners: number,
    };

    riotApiLibraries: {
        noLanguage: string,
        languageList: string,
        githubErrorList: string,
        githubErrorLanguage: string,
        baseURL: string,
        aliases: { [key: string]: string[] },
        channelTopics: { [key: string]: string[] },
        checkInterval: number,
    };

    versionChecker: {
        checkInterval: number,
        channel: string,
        gameThumbnail: string,
        dataDragonThumbnail: string,
    };

    logger: {
        server: string,

        prod: {
            errorChannel: string,
            logChannel: string,
        },

        dev: {
            errorChannel: string,
            logChannel: string,
        }

        errorChannel: string,
        logChannel: string,
    };

    apiStatus: {
        checkInterval: number,
        apiOnFireThreshold: number,
        statusUrl: string,
        onFireImages: string[],
    };

    onJoin: {
        messageFile: string;
    };

    apiUrlInterpreter: {
        timeOutDuration: number;
    };

    endpoint: {
        updateInterval: number,
        timeOutDuration: number,
        baseUrl: string,
        maxDistance: number,
        aliases: { [key: string]: string[] },
    };

    spam: {
        allowedUrls: string[];
        blockedUrls: string[];
        ignoredRoles: string[];
        floodMessageThreshold: number;
        floodMessageTime: number;
        duplicateMessageThreshold: number;
        duplicateMessageTime: number;
    };

    userIntro: {
        role: {
            id: string;
            name: string;
        };
        icon: { [lang: string]: string };
        lines: IntroLine[];
    }
}
