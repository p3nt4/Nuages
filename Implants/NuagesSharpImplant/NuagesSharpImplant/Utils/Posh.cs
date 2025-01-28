using System;
using System.Collections.ObjectModel;
using System.Management.Automation;
using System.Management.Automation.Runspaces;
using System.Text;

namespace NuagesSharpImplant.Utils
{
    public class Posh
    {
        Runspace singleRunspace;
        public Posh()
        {
            singleRunspace = RunspaceFactory.CreateRunspace();
            singleRunspace.Open();
        }   
        public string execute(string cmd, bool SinglePoshRunspace = true)
        {
            try
            {
                Runspace runspace;
                if (SinglePoshRunspace)
                {
                    runspace = singleRunspace;
                }
                else
                {
                    runspace = RunspaceFactory.CreateRunspace();
                    runspace.Open();
                }

                Pipeline pipeline = runspace.CreatePipeline();
                pipeline.Commands.AddScript(cmd);
                pipeline.Commands.Add("Out-String");
                Collection<PSObject> results = pipeline.Invoke();
                StringBuilder stringBuilder = new StringBuilder();
                foreach (PSObject obj in results)
                {
                    foreach (string line in obj.ToString().Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.None))
                    {
                        stringBuilder.AppendLine(line.TrimEnd());
                    }
                }

                if (!SinglePoshRunspace)
                {
                    runspace.Close();
                }

                return stringBuilder.ToString();
            }
            catch (Exception e)
            {
                string errorText = e.Message + "\n";
                return (errorText);
            }
        }
    }
}
