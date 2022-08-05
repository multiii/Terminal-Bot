import blessed from "neo-blessed";
import Discord from "discord.js";
import chalk from "chalk";

const main = async () => {
	const bot = new Discord.Client({
		allowedMentions: {
			parse: ["users", "roles"],
			repliedUser: true
		},
		intents: new Discord.Intents([
			"GUILDS",
			"GUILD_MEMBERS",
			"GUILD_BANS",
			"GUILD_EMOJIS_AND_STICKERS",
			"GUILD_INTEGRATIONS",
			"GUILD_WEBHOOKS",
			"GUILD_INVITES",
			"GUILD_VOICE_STATES",
			"GUILD_MESSAGES",
			"GUILD_MESSAGE_REACTIONS",
			"GUILD_MESSAGE_TYPING",
			"DIRECT_MESSAGES",
			"DIRECT_MESSAGE_REACTIONS",
			"DIRECT_MESSAGE_TYPING"
		]),
		partials: ["CHANNEL", "GUILD_MEMBER"]
	});

	const screen = blessed.screen({ smartCSR: true });

	let messageList = blessed.list({
		align: "left",
		mouse: true,
		keys: true,
		width: "100%",
		height: "90%",
		top: 0,
		left: 0,
		scrollbar: {
			ch: " ",
			inverse: true,
		},
		items: [],
	});

	// const messageList = blessed.list({
	//     align: 'left',
	//     tags: true,
	//     keys: true,
	//     vi: true,
	//     mouse: true,
	//     width: '100%',
	//     height: '90%',
	//     border: "line",
	//     top: 0,
	//     left: 0,
	//     scrollbar: {
	//         ch: ' ',
	//         track: {
	//             bg: 'cyan'
	//         },
	//         style: {
	//             inverse: true
	//         }
	//     },
	//     style: {
	//         item: {
	//             hover: {
	//                 bg: 'blue'
	//             }
	//         },
	//         selected: {
	//             bg: 'blue',
	//             bold: true
	//         },

	//     },
	//     items: [],
	//     search: function (callback) {
	//         prompt.input('Search:', '', function (err, value) {
	//             if (err) return;
	//             return callback(null, value);
	//         });
	//     }
	// });

	// Append our box to the screen.
	const input = blessed.textarea({
		bottom: 0,
		height: "10%",
		inputOnFocus: true,
		padding: {
			top: 1,
			left: 2,
		},
		style: {
			fg: "#787878",
			bg: "#454545",

			focus: {
				fg: "#f6f6f6",
				bg: "#353535",
			},
		},
	});

	const getEmote = name => {
		let emote = bot.emojis.cache.find(emoji => emoji.name.toLowerCase() == name.toLowerCase());

		if (!emote) return `:${name}:`;

		else return emote.toString();
	}

	const getMessage = message => {
		if (message.includes(":")) {
			let newMessage = "";
			for (let mPart of message.split(" ")) {

				mPart = mPart.trim();

				if (mPart.charAt(0) === ":" && mPart.charAt(mPart.length - 1) === ":") {
					newMessage += `${getEmote(mPart.slice(1, -1))} `
				}

				else newMessage += `${mPart} `;
			}
			message = newMessage;
		}

		return message;
	}

	let channelID = ""; // Enter your desired default server channel ID
	let userID;
	let arr;

	const channels = {};

	const users = {};

	let status = "online";

	let replying = false;
	let selectedMessage;

	const prefix = "/";

	let index = 0;
	let messages = [];

	const getChannel = async () => {
		if (!userID)
			return bot.channels.cache.get(channelID);

		const user = await bot.users.fetch(userID);
		return user.createDM();
	}

	const renderMessage = async (msg) => {
		const mins = msg.createdAt.getMinutes();
		const hours = msg.createdAt.getHours();

		const date = `${(hours < 10 ? "0" : "") + hours}:${(mins < 10 ? "0" : "") + mins}`;

		const indexStr = `[${index}]`;

		let ref = " ";

		if (msg.reference) {
			const repliedMsg = await msg.fetchReference()

			ref = ` Replying to ${repliedMsg.author.tag} `;
		}

		let content = msg.content;

		if (msg.embeds.length > 0) {
			content = chalk.yellow(`[${msg.embeds.length} Embed${msg.embeds.length > 1 ? "s" : ""}]`)

			if (msg.content)
				content += ` ${msg.content}`
		}

		else if (msg.attachments.size > 0) {
			content = chalk.yellow(`[${msg.attachments.size} Attachment${msg.attachments.size > 1 ? "s" : ""}]`)

			if (msg.content)
				content += ` ${msg.content}`
		}

		messageList.addItem(`${chalk.green(date)}${chalk.yellow(ref)}${chalk.blue(msg.author.tag)} ${content} ${chalk.green(indexStr)}`);
		messageList.scrollTo(100);
		screen.render();

		index++;
		messages.push(msg);
	}

	const renderMessages = async () => {
		const channel = await getChannel();

		channel.messages.fetch({ limit: 10 })
			.then(async msgs => {
				msgs = msgs.reverse();
				for (const msg of msgs.values()) {
					await renderMessage(msg);
				}
			})
			.catch(console.error);
	}

	bot.once("ready", async function () {
		messageList.addItem(chalk.cyan("Logged in!"));
		messageList.scrollTo(100);
		screen.render();

		await renderMessages();

	})

	bot.on("messageCreate", async msg => {
		const channel = await getChannel();
		if (msg.channel.id != channel.id) return;

		messageList.scrollTo(10000);
		screen.render();

		await renderMessage(msg);
	});

	input.key("enter", async () => {
		let message = input.getValue();

		try {
			if (message.startsWith(prefix)) {
				const args = message.slice(prefix.length).trim().split(" ");
				const command = args.shift().toLowerCase();

				if (command === "attach") {
					const channel = await getChannel();
					channel.send({ files: args });
				}

				if (command === "tts") {
					const channel = await getChannel();
					channel.send({ content: args.join(" "), tts: true });
				}

				else if (command === "watching")
					bot.user.setPresence({ activities: [{ name: args.join(" "), type: "WATCHING" }], status: status });

				else if (command === "listening")
					bot.user.setPresence({ activities: [{ name: args.join(" "), type: "LISTENING" }], status: status });

				else if (command === "playing")
					bot.user.setPresence({ activities: [{ name: args.join(" "), type: "PLAYING" }], status: status });

				else if (command === "streaming")
					bot.user.setPresence({ activities: [{ name: args.join(" "), type: "STREAMING", url: 'https://www.twitch.tv/ninja' }], status: status });

				else if (command === "online") {
					status = "online";
					bot.user.setStatus(status);
				}

				else if (command === "idle") {
					status = "idle";
					bot.user.setStatus(status);
				}

				else if (command === "dnd") {
					status = "dnd";
					bot.user.setStatus(status);
				}

				else if (["invisible", "invis", "offline"].includes(command)) {
					status = "invisible";
					bot.user.setStatus(status);
				}

				else if (command === "nick") {
					const channel = await getChannel();
					const guild = channel.guild;

					await guild.members.cache.get(bot.user.id).setNickname(args.join(" "));
				}

				else if (command === "sticker") {
					const channel = await getChannel();
					const guild = channel.guild;

					const stickers = guild.stickers.cache.values();
					let sticker;

					for (const s of stickers) {
						if (s.name.toLowerCase() === args.join(" ").toLowerCase()) {
							sticker = s;
							break;
						}
					}

					await channel.send({ stickers: [sticker] })
				}

				else if (command === "channel") {
					channelID = args[0];
					userID = undefined;

					if (channelID in channels)
						channelID = channels[channelID];

					messageList.clearItems();
					messageList.scrollTo(10000);
					screen.render();

					index = 0;
					messages = [];

					await renderMessages();
				}

				else if (command === "user") {
					userID = args[0];

					if (userID in users)
						userID = users[userID];

					else if (!parseInt(userID)) {
						let tag, chan, member;

						tag = userID;
						userID = undefined;
						chan = await getChannel();

						member = await bot.guilds.cache.get(chan.guildId).members.fetch({ query: tag, limit: 1 });
						userID = member.firstKey();
					}

					messageList.clearItems();
					messageList.scrollTo(10000);
					screen.render();

					index = 0;
					messages = [];

					await renderMessages();
				}

				else if (command === "clear") {
					index = 0;
					messages = [];

					messageList.clearItems();
					messageList.addItem(chalk.cyan("Cleared messages!"));
					messageList.scrollTo(100);
					screen.render();
				}

				else if (["inv", "invite"].includes(command)) {
					const channel = await getChannel();

					const embed = new Discord.MessageEmbed()
						.setTitle("Invite Me!")
						.setDescription(`To invite me to servers, [**click here!**](https://discord.com/api/oauth2/authorize?client_id=${bot.user.id}&permissions=8&scope=bot)`)
						.setColor("#A3BE8C")
						.setTimestamp()

					channel.send({ embeds: [embed] })
				}

				if (command === 'embed') {
					const channel = await getChannel();
					const parts = args.join(' ').split('|');

					let embed = {};

					for (let part of parts) {
						let field = part.split("=")[0];
						let value = part.split("=")[1];

						if (field == "footer")
							embed['footer'] = { "text": value };
						else
							embed[field] = value;
					}

					channel.send({ embeds: [embed] });
				}

				else if (command === "reply") {
					const ind = Number(args.shift());
					const replyMessage = getMessage(args.join(" "));

					await messages[ind].reply(replyMessage);
				}

				else if (command === "edit") {
					const ind = Number(args.shift());
					const editMessage = getMessage(args.join(" "));

					await messages[ind].edit({ content: editMessage });
				}

				else if (command === "shrug") {
					const channel = await getChannel();
					let m = "";

					if (args.length > 0)
						m = `${getMessage(args.join(' '))} `;

					channel.send(`${m}¯\\_(ツ)_/¯`);
				}

				else if (command === "tableflip") {
					const channel = await getChannel();
					let m = "";

					if (args.length > 0)
						m = `${getMessage(args.join(' '))} `;

					channel.send(`${m}(╯°□°）╯︵ ┻━┻`);
				}

				else if (command === "unflip") {
					const channel = await getChannel();
					let m = "";

					if (args.length > 0)
						m = `${getMessage(args.join(' '))} `;

					channel.send(`${m}┬─┬ ノ( ゜-゜ノ)`);
				}
			}

			else {
				let termMessage = getMessage(message);

				const channel = await getChannel();
				channel.send({ content: termMessage });

			}
		} catch (err) {
			console.log(err)
		} finally {
			input.clearValue();
			screen.render();
		}
	});

	// Append our box to the screen.
	screen.key(["escape", "q", "C-c"], () => {
		return process.exit(0);
	});

	screen.append(messageList);
	screen.append(input);
	input.focus();

	bot.login(process.env.TOKEN);
}

main();
