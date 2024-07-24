const test = require("node:test")
const assert = require("node:assert")
const crypto = require("node:crypto")
const fs = require("node:fs").promises

const expectEqual = async (t, name = "", input = "", expected = "") => {
	await t.test(name, () => {
		assert.strictEqual(input, expected)
	})
}

// https://docs.taiko.dev/api/reference/
const {
	openBrowser,
	closeBrowser,
	goto,
	write,
	timeField,
	clear,
	$,
	click,
	textBox,
	button,
	press,
	checkBox,
	accept,
	closeTab,
	currentURL
} = require("taiko")
const taiko = require("taiko")

const baseUrl = "https://spacebar.vanillaminigames.net/"
const suffix = "@vanillaminigames.net"

const main = async () => {
	let prevAccount = {}
	try {
		prevAccount = require("./accountData.json")
	} catch {}

	const username = prevAccount.username || "automated-user-" + Date.now()

	try {
		await openBrowser()

		if (prevAccount.username) {
			await goto(baseUrl + "login")

			await test("Login", async () => {
				await write(prevAccount.email, textBox("Email"))
				await write(prevAccount.password, textBox("Password"))

				await click(button("Login"))
				await waitFor(3000)

				await expectEqual(t, "Username", await $("#username").text(), username)
			})
		} else {
			await goto(baseUrl + "register")

			await test("Registration", async t => {
				await write("no-reply+" + username + suffix, textBox("Email"))
				await write(username, textBox("Username"))

				const password = crypto.randomBytes(32).toString("base64url")
				await write(password, textBox("Password"))
				await write("not-the-same", textBox("Enter password again"))

				await timeField("Date of birth").select(new Date("1970-01-01"))

				await click(button("Create account"))
				await expectEqual(t, "Password equal", await $("#wrong").text(), "Passwords don't match")

				await clear(textBox("Enter password again"))
				await write(password, textBox("Enter password again"))
				await click(button("Create account"))
				await expectEqual(t, "ToS check", await $("#wrong").text(),
					"Du musst den Nutzungsbedingungen und der Datenschutzerklärung zustimmen.")

				await click($("#tos-check"))
				await click(button("Create account"))
				await waitFor(3000)

				await expectEqual(t, "Username", await $("#username").text(), username)

				fs.writeFile("./accountData.json", JSON.stringify({
					username,
					email: "no-reply+" + username + "@vanillaminigames.net",
					password
				}))
			})
		}

		await test("Usage: Chatting", {skip: true}, async t => {
			await click($("#servers div:nth-child(4)"))
			await click($("#ch-1260645563867721629"))

			const message = "Test message " + Date.now()
			await write(message, $("#typebox"))
			await press("Enter")

			await waitFor(2000)
			await expectEqual(t, "Send message", await $(".messagecontainer > .flexttb > " +
				".messagediv:last-child > .message > .flexttb > .commentrow > .flexttb").text(), message)
		})

		await test("Usage: Settings", {skip: true}, async t => {
			await click($("#settings"))

			await clear(textBox("Pronouns"))
			await write("it", textBox("Pronouns"))
			await expectEqual(t, "Pronouns preview", await $("p.pronouns").text(), "it")

			/*await clear(textBox("Bio"))
			await write("it", textBox("Bio"))
			await expectEqual(t, "Bio preview", await $("p.pronouns").text(), "it")*/

			await dropDown("Theme").select("Light")

			await click(button("submit"))
		})

		await test("Usage: Connections", {skip: true}, async t => {
			await click($("#connections"))
			await waitFor(2000)

			await expectEqual(t, "YouTube connection list", await $("#connection-container div").text(), "Youtube")

			await click($("#connection-container div"))
			await waitFor(2000)
			await expectEqual(t, "YouTube connection OAuth2 URI",
				new URL(await currentURL()).origin, "https://accounts.google.com")
			await closeTab()

			await click($("dialog .close"))
		})

		await test("Usage: Developer Portal", {skip: true}, async t => {
			await click($("#dev-portal"))

			await waitFor(3000)

			if (await $("#app-list-container div h2").exists()) {
				await click($("#app-list-container div h2"))

				await expectEqual(t, "Bot is not public",
					await checkBox("Make bot publicly inviteable").isChecked(), false)

				const appName = await textBox("Application name").value()
				await click(button("Manage bot"))

				await waitFor(3000)

				await expectEqual(t, "Bot name",
					await $("dialog > table > tr > h2").text(), "Editing bot: " + appName)

				taiko.confirm(/.+/, async () => await accept())
				taiko.alert(/.+/, async () => await accept())
				await click(button("Reset token"))

				await t.test("Bot token reset")
			} else {
				await write("automated-bot-" + Date.now(), textBox("Name"))
				await click(button("Create application"))

				await waitFor(3000)

				await checkBox("Make bot publicly inviteable").uncheck()
				await click(button("Save changes"))

				await t.test("Create new application")
			}
		})
	} catch (error) {
		console.error(error)
	} finally {
		await closeBrowser()
	}
}
main()
