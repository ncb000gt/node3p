Node3P
===============

This is a tool to let you download music you've purchased through Amazon MP3 to your computer. It runs on NodeJS and some additional code. The functionality is mainly a port of the Pymazon work.


How to Use It
===============

* Install NodeJS
* Install the required libs
* Buy some tunes
* node node3p <path to download to> <amz file to download from>
* Go to http://www.amazon.com/gp/dmusic/after_download_manager_install.html
* Profit


Alpha Warning
==============

This is completely in alpha stages. The data downloads but the code is complete and utter crap. You'll likely want to look at it like you and eclipse or your eyeballs may melt. Assuming you are crazy enough to try this, please throw bugs at me like you might a can of Redbull and I'll try my best to hammer through them. Also, patches are very welcome.


Required/Included Libs
===============

npm install [request](http://github.com/mikeal/node-utils/)
npm install [base64](http://github.com/pkrumins/node-base64/)
npm install [xml2js](http://github.com/maqr/node-xml2js/)


Special Thanks
===============

Need to say thanks to the clamz people. They made this easy by doing the hard stuff of decrypting the AMZ file. Also to the Pymazon people, they worked out the process for actually getting sensible data. This wouldn't be out now if they hadn't.


License
===============

see license file