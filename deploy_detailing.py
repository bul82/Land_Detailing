#!/usr/bin/env python3
import os
import sys
import datetime
import argparse
import subprocess
import urllib.request
import paramiko

HOST = "138.16.225.102"
USER = "root"
KEY_FILE = "/Users/bul82/.ssh/catalog_zoj_vps"
PROJECT_NAME = "land-detailing"
LOCAL_DIR = "/Users/bul82/Documents/Land_Detailing"
LIVE_URL = f"https://bul82info.ru/{PROJECT_NAME}/"
FILES_TO_UPLOAD = ["index.html", "privacy.html", "styles.css", "script.js"]
IMAGE_EXTENSIONS = (".jpg", ".png", ".webp", ".avif")

def run_local(cmd, check=True):
    print(f"Running local command: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=LOCAL_DIR, text=True, capture_output=True)
    if result.stdout.strip():
        print(result.stdout.strip())
    if result.returncode != 0:
        if result.stderr.strip():
            print(result.stderr.strip())
        if check:
            sys.exit(result.returncode)
    return result

def git_has_changes():
    result = run_local(["git", "status", "--porcelain"], check=False)
    return bool(result.stdout.strip())

def commit_and_push(commit_message):
    run_local(["git", "status", "--short", "--branch"])
    if git_has_changes():
        run_local(["git", "add", *FILES_TO_UPLOAD, "assets/images", "deploy_detailing.py"])
        staged = run_local(["git", "diff", "--cached", "--name-only"], check=False).stdout.strip()
        if staged:
            run_local(["git", "commit", "-m", commit_message])
        else:
            print("No deploy-related changes to commit.")
    else:
        print("Working tree is clean; nothing to commit.")

    branch = run_local(["git", "branch", "--show-current"], check=False).stdout.strip()
    if branch:
        run_local(["git", "push", "origin", branch])

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

def verify_required_files():
    missing_files = [
        file_name for file_name in FILES_TO_UPLOAD
        if not os.path.isfile(os.path.join(LOCAL_DIR, file_name))
    ]
    if missing_files:
        print(f"Missing required files: {', '.join(missing_files)}")
        sys.exit(1)

    image_dir = os.path.join(LOCAL_DIR, "assets", "images")
    if not os.path.isdir(image_dir):
        print("Missing required assets/images directory.")
        sys.exit(1)

def verify_live_site():
    print(f"\nChecking live URL: {LIVE_URL}")
    try:
        request = urllib.request.Request(LIVE_URL, headers={"User-Agent": "LandDetailingDeploy/1.0"})
        with urllib.request.urlopen(request, timeout=20) as response:
            body = response.read().decode("utf-8", errors="replace")
            if response.status != 200:
                print(f"Live check failed with HTTP status {response.status}.")
                sys.exit(1)
            if "Под Крылом" not in body or "detailing-premium-hero.jpg" not in body:
                print("Live check failed: expected landing content was not found.")
                sys.exit(1)
    except Exception as e:
        print(f"Live check failed: {e}")
        sys.exit(1)
    print("Live check passed.")

def deploy(commit_message, skip_git):
    print(f"=== Land Detailing VPS Deployment ===")
    verify_required_files()
    
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
        for f in FILES_TO_UPLOAD:
            local_path = os.path.join(LOCAL_DIR, f)
            remote_path = f"{remote_release_dir}/{f}"
            print(f"Uploading: {f} -> {remote_path}")
            sftp.put(local_path, remote_path)
        run_command_over_ssh(ssh, f"mkdir -p {remote_release_dir}/assets/images")
        local_images = os.path.join(LOCAL_DIR, "assets", "images")
        if os.path.exists(local_images):
            for f in os.listdir(local_images):
                if f.endswith(IMAGE_EXTENSIONS):
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
    verify_live_site()
    if not skip_git:
        commit_and_push(commit_message)
    print("\n=== Land Detailing VPS Deployment Completed Successfully! ===")
    print(f"Live URL: {LIVE_URL}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Deploy Land_Detailing landing to VPS.")
    parser.add_argument(
        "--commit-message",
        default="Deploy updated detailing landing",
        help="Git commit message used after a successful deployment.",
    )
    parser.add_argument(
        "--skip-git",
        action="store_true",
        help="Deploy without committing or pushing changes.",
    )
    args = parser.parse_args()
    deploy(args.commit_message, args.skip_git)
