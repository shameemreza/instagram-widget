# Instagram Widget Plugin

Quite few times I had to face very hard time to integrate Instagram in my projects. For WordPress website, the journey was easy because of lot of Free and Premium plugins. But I faced big trouble for others projects. And to solve all of my problem, I created this plugin.

This could be name as plugin or a solution. As I am a WordPress lover and in WordPress we use Plugin to extend any features, thats why i am calling it as plugin.

## What its can do for you?

* You can show image using username or hashtag.
* You even can exclude image from a username
* you will be able to add follow button.
* 100% responsive and mobile friendly. (Tested by my clients.)
* Added image cacheing system and nice loading animation.
* You can hide or show widget header as like as Facebook likebox plugin for WordPress.
* You can small, medium, large, xlarge images.
* Easily customize using HTML and CSS
* Easy to understand JavaScript code strucutre.
* Added various language some support (25-09-17)
* You can choose your own colors for background, Wudget Panel, button and texts. (25-09-17)
* Added retina ready support, though not yet tested. (25-09-17)

## How to use

You can easily integrate Instagram Widget Plugin in your site. Its easy as drinking water.

Add Instagram widget files just in your site header as like as bellow:

```html
<link href="/instagram-widget/insta-widget.css" rel="stylesheet">
<script src="/instagram-widget/insta-widget.js"></script>
```

To work Instagram widget properly, make sure you added jQuery. If you didnt add jQuery, then you can add like bellow:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.3/jquery.min.js"></script>
```

Now its time to add Instagram Widget in your site.

```html
<div data-il 
     data-il-api="/instagram-widget/api/"
     data-il-username="shameemreza_"
     data-il-hashtag=""
     data-il-lang="en"
     data-il-show-heading="true"
     data-il-scroll="true"
     data-il-width="270px"
     data-il-height="350px"
     data-il-image-size="medium"
     data-il-bg-color="#285989"
     data-il-content-bg-color="#F8F8F8"
     data-il-font-color="#FFFFFF"
     data-il-ban="">
</div>
```

You can control everything using JSON file which has been included into API folder.
