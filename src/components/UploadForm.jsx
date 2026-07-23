import "./UploadForm.css";

function UploadForm() {
  return (
    <form className="upload-form">
      <input className="upload-form-input" type="file" disabled />
      <button className="upload-form-button" type="submit" disabled>
        Upload
      </button>
    </form>
  );
}

export default UploadForm;
