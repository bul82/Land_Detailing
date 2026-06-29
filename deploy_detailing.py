#!/usr/bin/env python3
import os
import sys
import datetime
import paramiko

HOST = "138.16.225.102"
USER = "root"
KEY_FILE = "/Users/bul82/.ssh/catalog_zoj_vps"
PROJECT_NAME = "land-detailing"
LOCAL_DIR = "/Users/bul82/Documents/Land_Detailing"

def run_command_over_ssh(ssh_client, cmd):
    print(f"Running remote command: {cmd}")
    stdin, stdout, stderr = ssh_client.exec_command(cmd)
    exit_status = stdout.channel.recv_exit_status()
    out_text = stdout.read().decode().strip()
    err_text = stderr.read().decode().strip()
    if exit_status != 0:
        print(f"Command failed with exit code {exit_status}")
        if err_text:
            print(f"Error output:\n{err_text}")
    return exit_status, out_text, err_text

def deploy():
    print(f"=== Land Detailing VPS Deployment ===")
    
    print("\nConnecting to VPS using physical interface en0 routing bypass...")
    try:
        proxy = paramiko.ProxyCommand(f'nc -b en0 {HOST} 22')
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        pkey = paramiko.Ed25519Key.from_private_key_file(KEY_FILE)
        ssh.connect(hostname=HOST, username=USER, pkey=pkey, sock=proxy, timeout=15)
        print("Successfully connected to VPS SSH server!")
    except Exception as e:
        print(f"SSH connection failed: {e}")
        sys.exit(1)
        
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    remote_base_dir = f"/var/www/landings/{PROJECT_NAME}"
    remote_release_dir = f"{remote_base_dir}/releases/{timestamp}"
    
    print(f"\nCreating release directory on server: {remote_release_dir}")
    run_command_over_ssh(ssh, f"mkdir -p {remote_release_dir}")
    
    print("\nUploading project files via SFTP...")
    try:
        sftp = ssh.open_sftp()
        files_to_upload = ["index.html", "privacy.html", "styles.css", "script.js"]
        for f in files_to_upload:
            local_path = os.path.join(LOCAL_DIR, f)
            remote_path = f"{remote_release_dir}/{f}"
            print(f"Uploading: {f} -> {remote_path}")
            sftp.put(local_path, remote_path)
        run_command_over_ssh(ssh, f"mkdir -p {remote_release_dir}/assets/images")
        local_images = os.path.join(LOCAL_DIR, "assets", "images")
        if os.path.exists(local_images):
            for f in os.listdir(local_images):
                if f.endswith((".jpg", ".png", ".webp", ".avif")):
                    local_path = os.path.join(local_images, f)
                    remote_path = f"{remote_release_dir}/assets/images/{f}"
                    print(f"Uploading image asset: assets/images/{f}")
                    sftp.put(local_path, remote_path)
        sftp.close()
        print("All files uploaded successfully!")
    except Exception as e:
        print(f"SFTP upload failed: {e}")
        ssh.close()
        sys.exit(1)
        
    print("\nUpdating symlinks...")
    current_symlink = f"{remote_base_dir}/current"
    symlink_cmd = f"ln -sfn releases/{timestamp} {current_symlink}"
    exit_status, _, _ = run_command_over_ssh(ssh, symlink_cmd)
    
    if exit_status == 0:
        print(f"Deployment successful! Symlink updated: {current_symlink} -> releases/{timestamp}")
    else:
        print("Failed to update symlink on remote VPS.")
        ssh.close()
        sys.exit(1)
        
    print("\nSetting ownership permissions on remote server...")
    run_command_over_ssh(ssh, f"chown -R www-data:www-data {remote_base_dir}")
        
    ssh.close()
    print("\n=== Land Detailing VPS Deployment Completed Successfully! ===")
    print(f"Live URL: https://bul82info.ru/{PROJECT_NAME}/")

if __name__ == "__main__":
    deploy()
