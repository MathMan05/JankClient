# How to add your instance to Jank Client
inside of webpage you'll see a file called `instances.json` in that file you'll need to add your instance and its information in the following format if you want your instance to be a part of the drop down.
```
{
    "name":<name>,
    "description"?:<short description>,
    "descriptionLong"?:<A description for the instance that can be longer>,
    "image"?:<URL to image repersenting your instance>,
    "url"?:<The URL that can be used to get your wellknown>,
    "language":<what language your server is in>,
    "country":<what country your server is in>,
    "display":<true or false depending on wether it should display>,
    "urls"?:{
        "wellknown":<wellknown URL>,
        "api":<API URL>,
        "cdn":<CDN URL>,
        "gateway":<gateway URL>,
        "login"?:<The URL that's used for login>
    },
    "contactInfo"?:{
        "discord"?:<Discord @>,
        "github"?:<github profile URL>,
        "email"?:<email address>,
        "spacebar":?:<spacebar username>,
        "matrix"?:<matrix account>,
        "mastodon"?:<mastodon account>
    }
}
```
anything with a `?` in-front of its `:` are optional, though you must either include `"URL"` or `"URLs"`, but you may include both, though the client will most likely ignore `"URLs"` in favor of `"URL"`, though it may use `"URLs"` as a fallback if `"URL"` does not resolve, do not rely on this behavior.
wellknown should be a url that can resolve the wellknown, but it should only be the base URL and not the full wellknown url.
Some of these values may not be used right now, though they will likely be used in the future, so feel free to fill out what you like, though the more you fill out the more information we can give the users about your instance in the future.
language should be [ISO 639-1](https://en.wikipedia.org/wiki/ISO_639-1_codes).
Country should be [ISO 8166-2 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2).
You can also add yourself to [this](https://github.com/spacebarchat/spacebarchat/tree/master/instances) list, and you should, though there are some disadvantages to only being in that list
# Questions
## Do I have to do this to let Jank Client connect to my server?
No, you may choose to not do this, this just makes it easier for people using Jank Client to find and use your instance as it's in the dropdown menu for instances, though the user may enter any instance they please.
## If my instance isn't spacebar is that allowed to be entered?
If it's spacebar compatable, yes it may be entered, though if there are too many incompatablities, it may not be included, or may need a warning of sorts.
## I'm hosting my own instance of spacebar and would like to change the defualt instance on my instance of Jank Client to my own instance.
Just change the first entry in the list to your own, and it should connect without issue.
## Why would I put my instance in this list over the official spacebar list?
While putting your instance in the other list will get it to show up on jank client, this list does have more settings, and will show up earlier in the results, though either list will work to get in the dropdown menu
