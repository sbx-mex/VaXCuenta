import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
import cleanup_legacy as cleaning
import commit_validated as committing

class CleanupTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.root=Path(self.temp.name)/"project"
        shutil.copytree(ROOT,self.root,ignore=shutil.ignore_patterns("dist","__pycache__",".git","node_modules"))
        self.rows=[]
        for name in ("site/index.html","dist/index.html"):
            file=self.root/name;file.parent.mkdir(parents=True,exist_ok=True);file.write_text("old copy\n")
            self.rows.append({"path":name,"gitBlobSha":cleaning.git_blob(file),"bytes":file.stat().st_size})
        self.manifest={"schemaVersion":1,"snapshotCommit":"test","directories":["site","dist"],"files":self.rows}
        (self.root/"scripts/legacy-files.json").write_text(json.dumps(self.manifest))
        self.before=cleaning.source_hashes(self.root)

    def tearDown(self):
        self.temp.cleanup()

    def test_preview_does_not_remove_any_file(self):
        result=cleaning.cleanup(self.root,False)
        self.assertEqual(len(result["files"]),2)
        self.assertTrue((self.root/"site/index.html").exists())
        self.assertEqual(cleaning.source_hashes(self.root),self.before)

    def test_verified_copies_removed_and_sources_preserved(self):
        result=cleaning.cleanup(self.root,True)
        self.assertEqual(len(result["files"]),2)
        self.assertFalse((self.root/"site").exists())
        self.assertFalse((self.root/"dist").exists())
        self.assertEqual(cleaning.source_hashes(self.root),self.before)
        self.assertTrue((self.root/"index.html").exists())
        self.assertTrue((self.root/"tests/fixtures/baseline-2026-10-11.json").exists())

    def test_unknown_file_aborts_before_any_removal(self):
        (self.root/"site/user-notes.txt").write_text("keep")
        with self.assertRaisesRegex(ValueError,"no identificado"):
            cleaning.cleanup(self.root,True)
        self.assertTrue((self.root/"site/index.html").exists())
        self.assertTrue((self.root/"dist/index.html").exists())

    def test_modified_old_file_is_preserved(self):
        (self.root/"dist/index.html").write_text("new edit")
        with self.assertRaisesRegex(ValueError,"modificado"):
            cleaning.cleanup(self.root,True)
        self.assertTrue((self.root/"site/index.html").exists())

    def test_root_application_must_exist_before_cleanup(self):
        (self.root/"index.html").unlink()
        with self.assertRaisesRegex(ValueError,"Falta archivo"):
            cleaning.cleanup(self.root,True)
        self.assertTrue((self.root/"site/index.html").exists())

    def test_changed_input_requires_fresh_audit(self):
        with (self.root/"data/Va X Cuenta.csv").open("ab") as file:
            file.write(b"x")
        with self.assertRaisesRegex(ValueError,"origen vigente"):
            cleaning.cleanup(self.root,True)
        self.assertTrue((self.root/"site/index.html").exists())

    def test_other_directories_cannot_be_deletion_targets(self):
        invalid={**self.manifest,"directories":["data","site"]}
        with self.assertRaisesRegex(ValueError,"sólo admite"):
            cleaning.cleanup(self.root,True,invalid)
        self.assertEqual(cleaning.source_hashes(self.root),self.before)

    def test_link_to_another_directory_is_rejected(self):
        shutil.rmtree(self.root/"site")
        external=Path(self.temp.name)/"outside";external.mkdir();(external/"keep.txt").write_text("keep")
        (self.root/"site").symlink_to(external,target_is_directory=True)
        with self.assertRaisesRegex(ValueError,"Ruta inesperada"):
            cleaning.cleanup(self.root,True)
        self.assertTrue((external/"keep.txt").exists())

    def test_second_run_is_idempotent_and_preserves_cleanup_history(self):
        cleaning.cleanup(self.root,True)
        before=(self.root/"docs/LIMPIEZA_OBSOLETOS.json").read_bytes()
        cleaning.cleanup(self.root,True)
        self.assertEqual(before,(self.root/"docs/LIMPIEZA_OBSOLETOS.json").read_bytes())

    def git(self,*args):
        return subprocess.check_output(["git",*args],cwd=self.root,stderr=subprocess.DEVNULL)

    def initialize_git(self):
        self.git("init","-q","-b","main")
        self.git("config","user.name","Test")
        self.git("config","user.email","test@example.invalid")
        self.git("add",".")
        self.git("add","-f","dist/index.html")
        self.git("commit","-qm","initial")

    def test_commit_retires_legacy_paths_even_after_dist_is_rebuilt(self):
        self.initialize_git()
        cleaning.cleanup(self.root,True)
        with patch.object(committing,"ROOT",self.root):
            committing.stage_obsolete()
            rebuilt=self.root/"dist/index.html";rebuilt.parent.mkdir();rebuilt.write_text("new build")
            committing.save()
        self.assertEqual(self.git("ls-files","site","dist"),b"")
        self.assertEqual(cleaning.source_hashes(self.root),self.before)
        self.assertNotEqual(self.git("ls-files","index.html"),b"")

    def test_commit_refuses_unrelated_staged_changes(self):
        self.initialize_git()
        (self.root/"unrelated.txt").write_text("unrelated")
        self.git("add","unrelated.txt")
        before=self.git("rev-parse","HEAD")
        with patch.object(committing,"ROOT",self.root), self.assertRaisesRegex(ValueError,"fuera de la limpieza"):
            committing.save()
        self.assertEqual(self.git("rev-parse","HEAD"),before)

if __name__=="__main__":
    unittest.main()
