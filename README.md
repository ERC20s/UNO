[UNO - up to 8 players]<p>
To get this setup you will need to:<br>
Get a remote server from someone like digitalocean <br>
Add nginx and get a secure ssh connection. (So the scene can connect to the game)<br>
Change the nginx config file and add your domain. (check the default file in /server)<br>
Add the contents of the server folder to the server (So the data received by the scene can be understood) <br>
This is shown here https://decentraland.org/blog/tutorials/servers-part-3/<br>
also check the readme in the server folder if lost..
<br>
change wsconnection.ts line 20 to your own server address<br>
Contact Butter#4840 on discord if you need some help.