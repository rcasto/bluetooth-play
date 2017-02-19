function CheckUserPswChars(szValue)
{
	var reg = /^[\x21-\x7e]+$/;	
	if((szValue.length > 0) && reg.test(szValue))
	{
		return true;
	}	
	return false;
}

function CheckUserPswInvalid()
{
	var userName = $("userName");
	var pcPassword = $("pcPassword");	
	
	if(!CheckUserPswChars(userName.value))
	{
		userName.select();
		userName.focus();
		return false;	
	}
	
	if(!CheckUserPswChars(pcPassword.value))
	{
		pcPassword.select();
		pcPassword.focus();
		return false;	
	}
	
	return true;
}

function ResetUserPsw(elementName)
{
	$(elementName).value = "";
	$(elementName).focus();
}

function PCWin(event)
{	
	if (event.keyCode == 13)
	{
		PCSubWin();
	}
}

function PCSubWin()
{
	if((httpAutErrorArray[0] == 2) || (httpAutErrorArray[0] == 3))
	{
		if(true == CheckUserPswInvalid())
		{
			var username = $("userName").value;				
			var password = $("pcPassword").value;	
			if(httpAutErrorArray[1] == 1)
			{
				password = hex_md5($("pcPassword").value);	
			}			
			var auth = "Basic "+ Base64Encoding(username + ":" + password);
			document.cookie = "Authorization="+escape(auth)+";path=/";
			//location.href ="/userRpm/LoginRpm.htm?Save=Save";
			$("loginForm").submit();
			return true;
		}
		else
		{
			$("note").innerHTML = "NOTE:";
			$("tip").innerHTML = "Username and password can contain between 1 - 15 characters and may not include spaces.";	
		}
	}
	return false;
}

function w(str)
{
	document.write(str);
}

function $(id)
{
	return document.getElementById(id);
}

function setElementStyle(bShow)
{
	var unLi = $("unLi");
	var pwLi = $("pwLi");
	var userName = $("userName");
	var pcPassword = $("pcPassword");
	var loginBtn = $("loginBtn");	
	
	if(bShow)
	{
		$("userName").style.display = "";
		$("pcPassword").style.display = "";		
		
		pcPassword.onfocus = function(){
			pwLi.style.background = "url(../login/loginPwdH.png)";
		};
		pcPassword.onblur = function(){
			pwLi.style.background = "url(../login/loginPwd.png)";
		};
		
		userName.onfocus = function(){
			unLi.style.background = "url(../login/loginUserH.png)";
		};
		userName.onblur = function(){
			unLi.style.background = "url(../login/loginUser.png)";
		};
		
		loginBtn.onmouseover = function(){
			loginBtn.style.background = "url(../login/loginBtnH.png)";
		};
		loginBtn.onmouseout = function(){
			loginBtn.style.background = "url(../login/loginBtn.png)";
		};
		
		$("userName").focus();
	}
	else
	{
		$("userName").style.display = "none";
		$("pcPassword").style.display = "none";		
	}
}

function pageLoad()
{
	var count = 14, tip = $("tip"), note = $("note");	
	var min = 0, sec = 0;
	document.cookie = "Authorization=;path=/";	
		
	if(window.parent != window)
	{
		window.parent.location.reload();
	}
	var ErrNum = httpAutErrorArray[0]; 
	switch(ErrNum)
	{
		case 0:
			note.innerHTML = "NOTE:";
			tip.innerHTML = "The router allows only one administrator to login at the same time, please try again later.";	
			setElementStyle(false);
		break;
		case 1:	
			note.innerHTML = "NOTE:";
			tip.innerHTML = "You have exceeded ten attempts, please try again after two hours.";	
			setElementStyle(false);
		break;
		case 2:
			note.innerHTML = "NOTE:";
			tip.innerHTML = "The username or password is incorrect, please input again.";
			setElementStyle(true);
		break;
		case 3:
		default:
			tip.innerHTML = "";
			note.innerHTML = "";
			setElementStyle(true);
		break;
	}
}