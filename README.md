Node3P
===============

This is a tool to let you download music you've purchased through Amazon MP3 to your computer. It runs on NodeJS and some additional code.


How to Use It
===============

* Install NodeJS
* Install the required libs
** From source, just clone this and type `npm install` from the cloned directory 
** From npm, type `npm install node3p` 
* Buy some tunes
* node3p [ path to download to ] [ amz file to download from ]
* Go to http://www.amazon.com/gp/dmusic/after_download_manager_install.html
* Profit


Alpha Warning
==============

This is completely in alpha stages. The data downloads but the code is complete and utter crap. You'll likely want to look at it like you and eclipse or your eyeballs may melt. Assuming you are crazy enough to try this, please throw bugs at me like you might a can of Redbull and I'll try my best to hammer through them. Also, patches are very welcome.


Dependencies
===============

* npm install [request](http://github.com/mikeal/node-utils/)
* npm install [base64](http://github.com/pkrumins/node-base64/)
* npm install [xml2js](http://github.com/maqr/node-xml2js/)


Interfaces
===============

Since people don't tend to like using the CLI there now exist front ends to this tool.

* [node3p-web](http://github.com/ncb000gt/node3p-web/): This is a web interface to `node3p`.


Special Thanks
===============

Need to say thanks to the clamz people. They made this easy by doing the hard stuff of decrypting the AMZ file. Also to the Pymazon people, they worked out the process for actually getting sensible data. This wouldn't be out now if they hadn't.


License
===============

It is very loosely based on the work done for Pymazon in that it shares ideas on decrypting the amz file. It was inspiration for this project. As such, I'll follow the wishes of the Pymazon author and use the GPLv3 license for this tool/library.

For specifics please see the license file.


Trademarks?
============

Node.js™ is an official trademark of Joyent. This module is not formally related to or endorsed by the official Joyent Node.js open source or commercial project