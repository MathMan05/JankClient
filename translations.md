# Translations
Currently Jank Client is only in english, though I've added support for other languages in the codebase now, if you or someone else wishes to try and help us create these translations it should be rather simple.
the translations are stored in `/src/webpage/translations` if you want to help translate a pre-existing translations, you would modify the JSON files there, if you wish to add a new translation that should also be somewhat straight forward
Firstly, modify `en.json` to include your languages file like for example for russian it'd be `"ru": "/translations/ru.json"` so jank client knows where the translation is, then you'd create the file and make sure to include a `"@metadata"` thing at the top to credit yourself, then in the file you'll want to create a property of the object corisponding to the language you're trying to add, for example
```json
{
    "@metadata": {
		"authors": [
		],
		"last-updated": "XXXX/XX/XX",
		"locale": "ru",
		"comment":""
	},
    "ru":{
    }
}
```
Then to add the actual translations, just take the english version and in the same structure add your language, you must keep the left side, as that's what jank needs to know what the translation is.

Thank you so much for contributing another lanuage, or even just parts, as jank will fall back to the english translation if your translation has gaps in it, so it's not all or nothing.

## What is the format?
It's the same format found [here](https://github.com/wikimedia/jquery.i18n#message-file-format), though we are not using jquery, and you might notice some of the strings use markdown, but most do not.

## I want to help correct a translation
Go ahead! We're more than happy to take corrections to translations as well!
