<?php

/**
* WP remote Library
*/
class WPremoteLibrary
{
	private static $key = "A_SECRET_KEY";
	private static $token = "A_SECRET_TOKEN";

	function __construct()
	{
		add_action( 'wp_ajax_nopriv_upload_files_remote', array($this, 'upload_files_remote') );
		add_action( 'wp_ajax_latera_upload_files_remote', array($this, 'upload_files_remote') );
		add_action( 'wp_ajax_nopriv_get_files_remote', array($this, 'get_files_remote') );
		add_action( 'wp_ajax_latera_get_files_remote', array($this, 'get_files_remote') );
		add_action( 'init', array( $this, 'add_icon100_image_size'), 9);
	}

	private static function json_resp($code, $message="", $data="") {
	    header_remove();
	    header('Access-Control-Allow-Origin: *');
	    header('Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept');
	    header('Access-Control-Allow-Methods: POST, GET, PATCH, DELETE, OPTIONS');
	    header('Content-Type: application/json');
	    $response = ["code" => $code, "message" => $message];
	    if(!empty($data) && $data != "") { $response["data"] = $data; }
	    return json_encode($response);
	} 

	private static function woptima_user_id_exists($user_id){
	    global $wpdb;
	    $count = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM $wpdb->users WHERE ID = %d", $user_id));
	    return $count > 0;
	}

	/**
    * ADD CUSTOM IMAGE SIZES TO WP EDITOR 
    **/
    function add_icon100_image_size() {
        add_image_size( 'icon100', '100', '100', false );
    }

	/**
    * Upload file
    */
    private static function upload_files_remote() {
		if(!isset($_POST["action"])) {
			$_POST = json_decode(file_get_contents('php://input'), true);
		}

		if(isset($_POST["key"]) && $_POST["key"] != self::$key || isset($_POST["token"]) && $_POST["token"] != self::$token) {
			echo self::json_resp(300,"Unauthorized");
			die();
		}

    	if(!woptima_isset_notempty([$_POST["user_id"],$_POST["files"]])) {
    		echo self::json_resp(300, "Missing parameters");
			die();
    	}

    	if(isset($_POST["user_id"]) && $_POST["user_id"] != "") {
			if(!self::woptima_user_id_exists($_POST["user_id"])) {
				echo self::json_resp(300, "User with given id does not exist");
				die();
			}
		}

    	$resp  = [];
    	$files = $_POST["files"];

    	if(empty($files) || !isset($files) || $files == "") {
			echo self::json_resp(300, "Error creating file on server - maybe due to wrong parameter value");
			die();
    	}

    	if(!is_array($files)) {
    		$tmp     = $files;
    		$files   = [];
    		$files[] = $tmp;
    	}

    	foreach ($files as $singleFile) {
    		$singleFile     = (object)$singleFile;
	    	$filename 		= $singleFile->filename;
	    	$nicename 		= str_replace(["-","_"], " ", pathinfo($filename, PATHINFO_FILENAME));
	    	$decoded 		= base64_decode($singleFile->file);
	    	$mime 			= $singleFile->mime;
	    	$user_id 		= $_POST["user_id"];
		    $upload_dir 	= wp_upload_dir();
			$upload_path 	= str_replace( '/', DIRECTORY_SEPARATOR, $upload_dir['path'] ) . DIRECTORY_SEPARATOR;

			elogp($filename);
			$image_upload 	= file_put_contents( $upload_path.$filename, $decoded );
			elogp($image_upload);

			if( !function_exists( 'wp_handle_sideload' ) ) {
			 	require_once( ABSPATH . 'wp-admin/includes/file.php' );
			}

			if( !function_exists( 'wp_get_current_user' ) ) {
			 	require_once( ABSPATH . 'wp-includes/pluggable.php' );
			}

			if ( ! function_exists( 'wp_crop_image' ) ) {
				require_once( ABSPATH . 'wp-admin/includes/image.php' );
			}

			$file             = array();
			$file['error']    = '';
			$file['tmp_name'] = $upload_path . $filename;
			$file['name']     = $filename;
			$file['type']     = $mime;
			$file['size']     = filesize( $upload_path . $filename );

			$file_return = wp_handle_sideload( $file, array( 'test_form' => false ) );
			$newfilename = $file_return['file'];

			$attachment = array(
			 'post_mime_type' 	=> $file_return['type'],
			 'post_content' 	=> '',
			 'post_status' 		=> 'inherit',
			 'post_author' 		=> $user_id,
			 'guid' 			=> $upload_dir['url'] . '/' . basename($newfilename),
			 'post_title' 		=> $nicename
			 );

			if($uploaded_file = wp_insert_attachment( $attachment, $newfilename )) {
				wp_update_post(['ID' => $uploaded_file, 'post_title' => $nicename]);

				$attach_data = wp_generate_attachment_metadata( $uploaded_file, $newfilename );
				wp_update_attachment_metadata( $uploaded_file, $attach_data );

				$filedata 		= get_post($uploaded_file);
				$img_parts		= pathinfo($filedata->guid);
				$icon 			= $img_parts["dirname"].$img_parts["filename"]."-100x100.".$img_parts["extension"];
				$filedata->icon = $icon;

				$resp[] = $filedata;
			} else {
				echo self::json_resp(300, "Error creating file on server - maybe due to wrong parameter value");
				die();
			}
		}

		echo self::json_resp(200, "Success", $resp);
    	die();
	}

	/**
    * Get attachments
    */
    private static function get_user_files($user_id="",$showAll=false) {
    	if(!isset($_POST["action"])) {
			$_POST = json_decode(file_get_contents('php://input'), true);
		}

		if(isset($_POST["key"]) && $_POST["key"] != self::$key || isset($_POST["token"]) && $_POST["token"] != self::$token) {
			echo self::json_resp(300,"Unauthorized");
			die();
		}

    	if(!woptima_isset_notempty($_POST["user_id"])) {
    		echo self::json_resp(300, "Missing parameters");
			die();
    	}

    	if(isset($_POST["user_id"]) && $_POST["user_id"] != "") {
			if(!self::woptima_user_id_exists($_POST["user_id"])) {
				echo self::json_resp(300, "User with given id does not exist");
				die();
			}
		}

	    $args = array(
		    'post_type'      => 'attachment',
		    'posts_per_page' => -1,
		);

		if(!$showAll) {
			$args['author'] = $user_id,
		}

		$files = get_posts( $args );

		if(empty($files)) {
			echo self::json_resp(300, "No files");
	    	die();
		}

		foreach ($files as $key => $file) {
			$img_parts		= pathinfo($file->guid);
			$name			= $img_parts['filename'];
			$icon 			= wp_get_attachment_image_src( $file->ID, 'icon100' );
			$file->icon   	= $icon[0];
			$file->filename = $name;
		}
		
		echo self::json_resp(200, "Success", $files);
    	die();
    }

}