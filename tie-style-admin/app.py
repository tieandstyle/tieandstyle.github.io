"""
Tie-Style Admin Panel - Flask Application
Main application file with all routes for managing the e-commerce store
"""

from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, send_from_directory
import os
import json
from datetime import datetime
import utils
import sys
import traceback
try:
    from git import Repo, GitCommandError
except ImportError:
    Repo = None
    GitCommandError = Exception
try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv(*args, **kwargs):
        return False
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = 'tie-style-admin-secret-key-change-in-production'  # Change this in production!

# --- PUBLISH TO GITHUB ENDPOINT ---
@app.route('/publish', methods=['GET', 'POST'])
def publish_to_github():
    """
    Commit and push changes to GitHub repo using GitPython.
    Reads repo path, token, and repo URL from environment variables for security.
    """
    if Repo is None:
        return jsonify({"ok": False, "error": "GitPython not installed"}), 500
    repo_dir = os.getenv("REPO_DIR", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    token = os.getenv("GITHUB_TOKEN")
    repo_url = os.getenv("GITHUB_REPO_URL")
    branch = os.getenv("PUBLISH_BRANCH", "dev")
    remote_name = os.getenv("REMOTE_NAME", "origin")
    commit_message = request.args.get("message") or (request.json.get("message") if request.is_json else "Auto commit from Flask App")
    if not token or not repo_url:
        return jsonify({"ok": False, "error": "GITHUB_TOKEN and GITHUB_REPO_URL must be set in .env"}), 400
    # Inject token into URL for HTTPS push
    if repo_url.startswith("https://"):
        at_idx = repo_url.find("//")
        push_url = repo_url[:at_idx+2] + f"x-access-token:{token}@" + repo_url[at_idx+2:]
    else:
        push_url = repo_url
    try:
        # Check if .git directory exists
        git_dir = os.path.join(repo_dir, '.git')
        if not os.path.exists(git_dir):
            return jsonify({
                "ok": False, 
                "error": f"Not a git repository: {repo_dir}. Make sure .git folder exists."
            }), 400
        
        # Initialize repo and fix ownership issues
        try:
            repo = Repo(repo_dir)
        except Exception as repo_error:
            # Try to fix git ownership issue
            try:
                os.system(f'git config --global --add safe.directory "{repo_dir}"')
                repo = Repo(repo_dir)
            except:
                return jsonify({
                    "ok": False, 
                    "error": f"Cannot access git repository. Try running: git config --global --add safe.directory \"{repo_dir}\""
                }), 500
        
        # Check if there are any changes
        changed_files = []
        if repo.is_dirty(untracked_files=True):
            changed_files = [item.a_path for item in repo.index.diff(None)] + repo.untracked_files
        
        # If no changes, return early
        if not changed_files:
            return jsonify({
                "ok": True, 
                "message": "ℹ️ No new changes to commit", 
                "branch": branch,
                "changes": []
            })
        
        # Add and commit changes
        repo.git.add(all=True)
        commit_result = repo.index.commit(commit_message)
        
        # Temporarily set remote URL with token and push
        remote = repo.remote(name=remote_name)
        original_url = remote.url
        
        try:
            remote.set_url(push_url)
            
            # Try to push with detailed error handling
            try:
                # First try normal push
                push_info = remote.push(refspec=f"{branch}:{branch}")
                
                # Check if push was successful
                if push_info and len(push_info) > 0:
                    push_result = push_info[0]
                    if push_result.flags & push_result.ERROR:
                        # If error contains rejection, try FORCE PUSH
                        if "rejected" in push_result.summary.lower() or "fetch first" in push_result.summary.lower():
                            print(f"⚠️ Push rejected: {push_result.summary}")
                            print(f"⚠️ Attempting FORCE PUSH to {branch}...")
                            try:
                                push_info = remote.push(refspec=f"{branch}:{branch}", force=True)
                                print(f"✅ Successfully FORCE PUSHED to {branch}")
                                # Continue to success response below
                            except Exception as force_err:
                                error_msg = f"Push rejected and force push failed: {str(force_err)}"
                                remote.set_url(original_url)
                                return jsonify({"ok": False, "error": error_msg}), 500
                        else:
                            error_msg = f"Push failed: {push_result.summary}"
                            remote.set_url(original_url)
                            return jsonify({"ok": False, "error": error_msg}), 500
                    elif push_result.flags & push_result.REJECTED:
                        # If rejected, try FORCE PUSH
                        print(f"⚠️ Normal push rejected, attempting FORCE PUSH to {branch}...")
                        try:
                            push_info = remote.push(refspec=f"{branch}:{branch}", force=True)
                            print(f"✅ Successfully FORCE PUSHED to {branch}")
                            # Continue to success response below
                        except Exception as force_err:
                            error_msg = f"Push rejected and force push failed: {str(force_err)}"
                            remote.set_url(original_url)
                            return jsonify({"ok": False, "error": error_msg}), 500
                
            except GitCommandError as git_err:
                remote.set_url(original_url)
                error_msg = str(git_err)
                
                # Provide helpful error messages
                if "Could not resolve host" in error_msg:
                    error_msg = "❌ Cannot connect to GitHub. Check your internet connection."
                elif "Authentication failed" in error_msg or "Invalid username or password" in error_msg:
                    error_msg = "❌ GitHub authentication failed. Check your GITHUB_TOKEN in .env file."
                elif "Repository not found" in error_msg:
                    error_msg = "❌ Repository not found. Check GITHUB_REPO_URL in .env file."
                elif "failed to push" in error_msg:
                    error_msg = f"❌ Push failed: {error_msg}"
                
                return jsonify({"ok": False, "error": error_msg}), 500
                
            # Restore original URL
            remote.set_url(original_url)
            
        except Exception as push_error:
            # Make sure to restore original URL even if something goes wrong
            try:
                remote.set_url(original_url)
            except:
                pass
            raise push_error
        
        return jsonify({
            "ok": True, 
            "message": f"✅ Successfully Published to GitHub! ({len(changed_files)} files)", 
            "branch": branch,
            "commit": str(commit_result)[:8],
            "changes": changed_files[:10]  # Show first 10 changed files
        })
    except GitCommandError as git_e:
        traceback.print_exc(file=sys.stderr)
        return jsonify({"ok": False, "error": f"Git error: {str(git_e)}"}), 500
    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        return jsonify({"ok": False, "error": f"Unexpected error: {str(e)}"}), 500

# Configuration - Use parent directory's assets and image folders
PARENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_FOLDER = os.path.join(PARENT_DIR, 'assets')
IMAGE_FOLDER = os.path.join(PARENT_DIR, 'image')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE
app.config['ASSETS_FOLDER'] = ASSETS_FOLDER
app.config['IMAGE_FOLDER'] = IMAGE_FOLDER

def allowed_file(filename):
    """Check if the uploaded file has an allowed extension"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def delete_image_file(image_path):
    """
    Delete an image file from the parent directory.
    
    Args:
        image_path: Path like "assets/categories/scrunchies.png" or "image/news/offer.jpg"
    """
    if not image_path:
        return
    
    try:
        # Convert relative path to absolute path
        full_path = os.path.join(PARENT_DIR, image_path)
        if os.path.exists(full_path):
            os.remove(full_path)
            print(f"Deleted image: {full_path}")
    except Exception as e:
        print(f"Error deleting image {image_path}: {e}")

def save_uploaded_file(file, subfolder='', use_image_dir=False, custom_filename=None):
    """
    Save an uploaded file to the appropriate folder in the main e-commerce app.
    
    Args:
        file: The uploaded file object
        subfolder: Optional subfolder within assets or image (e.g., 'products/scrunchies', 'categories')
        use_image_dir: If True, save to 'image/' folder, otherwise save to 'assets/' folder
        custom_filename: Optional custom filename (without extension, e.g., 'scrunchies')
        
    Returns:
        The relative path to the saved file (as it should appear in JSON), or None if save failed
    """
    if file and allowed_file(file.filename):
        original_filename = secure_filename(file.filename)
        _, ext = os.path.splitext(original_filename)
        
        # Use custom filename if provided, otherwise use original with timestamp
        if custom_filename:
            filename = f"{secure_filename(custom_filename)}{ext}"
        else:
            # Add timestamp to filename to avoid conflicts
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            name, _ = os.path.splitext(original_filename)
            filename = f"{name}_{timestamp}{ext}"
        
        # Choose base directory
        base_dir = IMAGE_FOLDER if use_image_dir else ASSETS_FOLDER
        
        # Create subfolder if it doesn't exist
        upload_path = os.path.join(base_dir, subfolder)
        utils.ensure_directory_exists(upload_path)
        
        # Save the file
        filepath = os.path.join(upload_path, filename)
        file.save(filepath)
        
        # Return the path as it should appear in JSON
        # For assets: "assets/products/scrunchies/filename.png"
        # For image: "image/news/filename.jpg"
        base_folder = 'image' if use_image_dir else 'assets'
        json_path = os.path.join(base_folder, subfolder, filename).replace('\\', '/')
        
        return json_path
    return None

# ==================== DASHBOARD ====================

@app.route('/')
def index():
    """Main dashboard page"""
    stats = utils.get_dashboard_stats()
    store_info = utils.get_store_info()
    return render_template('dashboard.html', stats=stats, store=store_info)

@app.route('/analytics')
def analytics():
    """Analytics dashboard page"""
    analytics_data = utils.get_analytics_data()
    return render_template('analytics.html', analytics=analytics_data)

# ==================== PRODUCTS ====================

@app.route('/products')
def products():
    """List all products"""
    products = utils.get_all_products()
    categories = utils.get_all_categories()
    subcategories = utils.get_all_subcategories()
    
    # Create lookup dictionaries for easier display
    category_lookup = {cat['id']: cat['name'] for cat in categories}
    subcategory_lookup = {subcat['id']: subcat['name'] for subcat in subcategories}
    
    return render_template('products.html', 
                         products=products, 
                         category_lookup=category_lookup,
                         subcategory_lookup=subcategory_lookup)

@app.route('/products/add', methods=['GET', 'POST'])
def add_product():
    """Add a new product"""
    if request.method == 'POST':
        # Auto-generate Product ID
        all_products = utils.get_all_products()
        max_id_number = 0
        for prod in all_products:
            if prod['id'].startswith('prod-'):
                try:
                    num = int(prod['id'].split('-')[-1])
                    max_id_number = max(max_id_number, num)
                except:
                    pass
        new_id = f'prod-{str(max_id_number + 1).zfill(3)}'
        
        # Auto-generate SKU from title
        title = request.form.get('title', '')
        words = title.upper().split()
        if len(words) >= 2:
            sku = words[0][:4] + '-' + words[1][:3] + '-' + str(max_id_number + 1).zfill(3)
        elif len(words) == 1:
            sku = words[0][:7] + '-' + str(max_id_number + 1).zfill(3)
        else:
            sku = 'PROD-' + str(max_id_number + 1).zfill(3)
        
        # Get form data
        product_data = {
            'id': new_id,
            'sku': sku,
            'title': title,
            'slug': utils.generate_slug(title),
            'categoryIds': request.form.getlist('categoryIds'),
            'subcategoryId': request.form.get('subcategoryId'),
            'price': float(request.form.get('price', 0)),
            'currency': request.form.get('currency', 'INR'),
            'stock': int(request.form.get('stock', 0)),
            'available': request.form.get('available') == 'on',
            'images': [],
            'attributes': {},
            'shortDescription': request.form.get('shortDescription', ''),
            'description': request.form.get('description', ''),
            'tags': [tag.strip() for tag in request.form.get('tags', '').split(',') if tag.strip()]
        }
        
        # Handle sizes
        sizes = request.form.getlist('sizes')
        if sizes:
            product_data['sizes'] = [size.strip() for size in sizes if size.strip()]
        
        # Handle attributes (dynamic fields)
        attribute_keys = request.form.getlist('attribute_key')
        attribute_values = request.form.getlist('attribute_value')
        for key, value in zip(attribute_keys, attribute_values):
            if key and value:
                product_data['attributes'][key] = value
        
        # Handle color variants (dynamic fields)
        color_names = request.form.getlist('color_name')
        color_hexes = request.form.getlist('color_hex')
        color_stocks = request.form.getlist('color_stock')
        color_availables = request.form.getlist('color_available')
        
        colors = []
        color_count = 0
        for i, (name, hex_val) in enumerate(zip(color_names, color_hexes)):
            if name and hex_val:
                # Checkbox is checked if 'on' appears in the availables list at the same position
                is_available = 'on' in color_availables[color_count:color_count+1] if color_count < len(color_availables) else False
                
                color_data = {
                    'name': name.strip(),
                    'hex': hex_val.strip(),
                    'stock': int(color_stocks[i]) if i < len(color_stocks) and color_stocks[i] else 0,
                    'available': is_available
                }
                colors.append(color_data)
                color_count += 1
        
        if colors:
            product_data['colors'] = colors
        
        # Handle multiple image uploads (up to 6)
        if 'images' in request.files:
            files = request.files.getlist('images')
            uploaded_images = []
            
            # Limit to 6 images
            files = files[:6]
            
            # Determine subfolder based on category
            category_slug = ''
            if product_data['subcategoryId']:
                subcats = utils.get_all_subcategories()
                for sc in subcats:
                    if sc['id'] == product_data['subcategoryId']:
                        category_slug = sc['slug']
                        break
            
            product_slug = product_data['slug']
            
            for index, file in enumerate(files):
                if file.filename:
                    # Save each image with numbered suffix
                    custom_filename = f'{product_slug}-{index+1}' if index > 0 else product_slug
                    image_path = save_uploaded_file(file, f'products/{category_slug}', use_image_dir=False, custom_filename=custom_filename)
                    if image_path:
                        uploaded_images.append(image_path)
            
            if uploaded_images:
                product_data['images'] = uploaded_images
        
        # Save the product
        if utils.save_product(product_data, is_new=True):
            flash('Product added successfully!', 'success')
            return redirect(url_for('products'))
        else:
            flash('Error adding product.', 'error')
    
    # GET request - show the form
    categories = utils.get_all_categories()
    subcategories = utils.get_all_subcategories()
    return render_template('edit_product.html', 
                         product=None, 
                         categories=categories,
                         subcategories=subcategories,
                         mode='add')

@app.route('/products/edit/<product_id>', methods=['GET', 'POST'])
def edit_product(product_id):
    """Edit an existing product"""
    product = utils.get_product_by_id(product_id)
    
    if not product:
        flash('Product not found.', 'error')
        return redirect(url_for('products'))
    
    if request.method == 'POST':
        # Update product data (keep original ID and SKU)
        product['title'] = request.form.get('title')
        product['slug'] = utils.generate_slug(request.form.get('title', ''))
        product['categoryIds'] = request.form.getlist('categoryIds')
        product['subcategoryId'] = request.form.get('subcategoryId')
        product['price'] = float(request.form.get('price', 0))
        product['currency'] = request.form.get('currency', 'INR')
        product['stock'] = int(request.form.get('stock', 0))
        product['available'] = request.form.get('available') == 'on'
        product['shortDescription'] = request.form.get('shortDescription', '')
        product['description'] = request.form.get('description', '')
        product['tags'] = [tag.strip() for tag in request.form.get('tags', '').split(',') if tag.strip()]
        
        # Remove taxRatePct if it exists
        if 'taxRatePct' in product:
            del product['taxRatePct']
        
        # Update sizes
        sizes = request.form.getlist('sizes')
        if sizes:
            product['sizes'] = [size.strip() for size in sizes if size.strip()]
        elif 'sizes' in product:
            # Remove sizes if none provided
            del product['sizes']
        
        # Update attributes
        product['attributes'] = {}
        attribute_keys = request.form.getlist('attribute_key')
        attribute_values = request.form.getlist('attribute_value')
        for key, value in zip(attribute_keys, attribute_values):
            if key and value:
                product['attributes'][key] = value
        
        # Update color variants
        color_names = request.form.getlist('color_name')
        color_hexes = request.form.getlist('color_hex')
        color_stocks = request.form.getlist('color_stock')
        color_availables = request.form.getlist('color_available')
        
        colors = []
        color_count = 0
        for i, (name, hex_val) in enumerate(zip(color_names, color_hexes)):
            if name and hex_val:
                # Checkbox is checked if 'on' appears in the availables list at the same position
                is_available = 'on' in color_availables[color_count:color_count+1] if color_count < len(color_availables) else False
                
                color_data = {
                    'name': name.strip(),
                    'hex': hex_val.strip(),
                    'stock': int(color_stocks[i]) if i < len(color_stocks) and color_stocks[i] else 0,
                    'available': is_available
                }
                colors.append(color_data)
                color_count += 1
        
        if colors:
            product['colors'] = colors
        else:
            # Remove colors if none provided
            if 'colors' in product:
                del product['colors']
        
        # Handle multiple image uploads (if new images provided)
        if 'images' in request.files:
            files = request.files.getlist('images')
            # Check if any file was actually selected
            if any(file.filename for file in files):
                # Delete old images first
                if product.get('images'):
                    for old_image in product['images']:
                        delete_image_file(old_image)
                
                # Determine subfolder based on category
                category_slug = ''
                if product['subcategoryId']:
                    subcats = utils.get_all_subcategories()
                    for sc in subcats:
                        if sc['id'] == product['subcategoryId']:
                            category_slug = sc['slug']
                            break
                
                # Upload new images (up to 6)
                uploaded_images = []
                product_slug = product['slug']
                
                # Limit to 6 images
                files = files[:6]
                
                for index, file in enumerate(files):
                    if file.filename:
                        # Save each image with numbered suffix
                        custom_filename = f'{product_slug}-{index+1}' if index > 0 else product_slug
                        image_path = save_uploaded_file(file, f'products/{category_slug}', use_image_dir=False, custom_filename=custom_filename)
                        if image_path:
                            uploaded_images.append(image_path)
                
                if uploaded_images:
                    product['images'] = uploaded_images
        
        # Save the updated product
        if utils.save_product(product, is_new=False):
            flash('Product updated successfully!', 'success')
            return redirect(url_for('products'))
        else:
            flash('Error updating product.', 'error')
    
    # GET request - show the form with existing data
    categories = utils.get_all_categories()
    subcategories = utils.get_all_subcategories()
    return render_template('edit_product.html', 
                         product=product, 
                         categories=categories,
                         subcategories=subcategories,
                         mode='edit')

@app.route('/products/delete/<product_id>', methods=['POST'])
def delete_product(product_id):
    """Delete a product"""
    # Get the product first to delete its images
    product = utils.get_product_by_id(product_id)
    if product:
        # Delete all product images
        if product.get('images'):
            for image_path in product['images']:
                delete_image_file(image_path)
        
        # Delete the product
        if utils.delete_product(product_id):
            flash('Product deleted successfully!', 'success')
        else:
            flash('Error deleting product.', 'error')
    else:
        flash('Product not found.', 'error')
    return redirect(url_for('products'))

# ==================== CATEGORIES ====================

@app.route('/categories')
def categories():
    """List all categories and subcategories"""
    categories = utils.get_all_categories()
    subcategories = utils.get_all_subcategories()
    return render_template('categories.html', 
                         categories=categories,
                         subcategories=subcategories)

@app.route('/categories/add', methods=['GET', 'POST'])
def add_category():
    """Add a new category"""
    if request.method == 'POST':
        category_type = request.form.get('category_type')
        
        if category_type == 'main':
            # Add main category
            # Auto-generate sequential category ID
            categories = utils.get_all_categories()
            existing_ids = [cat['id'] for cat in categories]
            category_id = utils.generate_sequential_id('cat-', existing_ids)
            
            category_data = {
                'id': category_id,
                'name': request.form.get('name'),
                'slug': utils.generate_slug(request.form.get('name', '')),
                'description': request.form.get('description', ''),
                'image': '',
                'parentId': None,
                'order': int(request.form.get('order', 1)),
                'active': request.form.get('active') == 'on'
            }
            
            # Handle image upload
            if 'image' in request.files:
                file = request.files['image']
                if file.filename:
                    # Save to assets/categories/ with category slug as filename
                    category_slug = category_data['slug']
                    image_path = save_uploaded_file(file, 'categories', use_image_dir=False, custom_filename=category_slug)
                    if image_path:
                        category_data['image'] = image_path
            
            if utils.save_category(category_data, is_new=True):
                flash('Category added successfully!', 'success')
            else:
                flash('Error adding category.', 'error')
        
        else:
            # Add subcategory
            # Auto-generate sequential subcategory ID
            subcategories = utils.get_all_subcategories()
            parent_id = request.form.get('parentCategoryId')
            
            # Generate ID based on parent (e.g., subcat-scr-01 for scrunchies)
            parent_slug = ''
            if parent_id:
                parent_cat = utils.get_category_by_id(parent_id)
                if parent_cat:
                    parent_slug = parent_cat['slug'][:3]  # First 3 chars of slug
            
            # Get existing subcategory IDs for this parent
            existing_ids = [sc['id'] for sc in subcategories]
            subcategory_id = utils.generate_sequential_id(f'subcat-{parent_slug}-', existing_ids)
            
            subcategory_data = {
                'id': subcategory_id,
                'name': request.form.get('name'),
                'slug': utils.generate_slug(request.form.get('name', '')),
                'description': request.form.get('description', ''),
                'parentCategoryId': parent_id,
                'order': int(request.form.get('order', 1)),
                'active': request.form.get('active') == 'on'
            }
            
            if utils.save_subcategory(subcategory_data, is_new=True):
                flash('Subcategory added successfully!', 'success')
            else:
                flash('Error adding subcategory.', 'error')
        
        return redirect(url_for('categories'))
    
    # GET request
    categories = utils.get_all_categories()
    return render_template('edit_category.html', 
                         category=None,
                         categories=categories,
                         mode='add')

@app.route('/categories/edit/<category_id>', methods=['GET', 'POST'])
def edit_category(category_id):
    """Edit a category or subcategory"""
    # Check if it's a main category or subcategory
    category = utils.get_category_by_id(category_id)
    is_main = category is not None
    
    if not is_main:
        # It's a subcategory
        subcategories = utils.get_all_subcategories()
        category = next((sc for sc in subcategories if sc['id'] == category_id), None)
    
    if not category:
        flash('Category not found.', 'error')
        return redirect(url_for('categories'))
    
    if request.method == 'POST':
        if is_main:
            # Update main category
            old_image = category.get('image', '')
            
            category['name'] = request.form.get('name')
            category['slug'] = utils.generate_slug(request.form.get('name', ''))
            category['description'] = request.form.get('description', '')
            category['order'] = int(request.form.get('order', 1))
            category['active'] = request.form.get('active') == 'on'
            
            # Handle image upload
            if 'image' in request.files:
                file = request.files['image']
                if file.filename:
                    # Delete old image if it exists
                    if old_image:
                        delete_image_file(old_image)
                    
                    # Save to assets/categories/ with category slug as filename
                    category_slug = category['slug']
                    image_path = save_uploaded_file(file, 'categories', use_image_dir=False, custom_filename=category_slug)
                    if image_path:
                        category['image'] = image_path
            
            if utils.save_category(category, is_new=False):
                flash('Category updated successfully!', 'success')
            else:
                flash('Error updating category.', 'error')
        else:
            # Update subcategory
            category['name'] = request.form.get('name')
            category['slug'] = utils.generate_slug(request.form.get('name', ''))
            category['description'] = request.form.get('description', '')
            category['parentCategoryId'] = request.form.get('parentCategoryId')
            category['order'] = int(request.form.get('order', 1))
            category['active'] = request.form.get('active') == 'on'
            
            if utils.save_subcategory(category, is_new=False):
                flash('Subcategory updated successfully!', 'success')
            else:
                flash('Error updating subcategory.', 'error')
        
        return redirect(url_for('categories'))
    
    # GET request
    all_categories = utils.get_all_categories()
    return render_template('edit_category.html', 
                         category=category,
                         categories=all_categories,
                         is_main=is_main,
                         mode='edit')

@app.route('/categories/delete/<category_id>', methods=['POST'])
def delete_category(category_id):
    """Delete a category or subcategory"""
    # Get the category/subcategory first to delete its image
    category = utils.get_category_by_id(category_id)
    if category:
        # Delete image if it exists
        if category.get('image'):
            delete_image_file(category['image'])
        # Delete the category
        if utils.delete_category(category_id):
            flash('Category deleted successfully!', 'success')
        else:
            flash('Error deleting category.', 'error')
    else:
        # Try subcategory
        subcategories = utils.get_all_subcategories()
        subcategory = next((sc for sc in subcategories if sc['id'] == category_id), None)
        if subcategory:
            # Subcategories don't have images, just delete
            if utils.delete_subcategory(category_id):
                flash('Subcategory deleted successfully!', 'success')
            else:
                flash('Error deleting subcategory.', 'error')
        else:
            flash('Category not found.', 'error')
    return redirect(url_for('categories'))

# ==================== NEWS & OFFERS ====================

@app.route('/news')
def news():
    """List all news items"""
    news_items = utils.get_all_news()
    return render_template('news.html', news_items=news_items)

@app.route('/news/add', methods=['GET', 'POST'])
def add_news():
    """Add a new news item"""
    if request.method == 'POST':
        news_data = {
            'id': request.form.get('id'),
            'title': request.form.get('title'),
            'slug': utils.generate_slug(request.form.get('title', '')),
            'type': request.form.get('type', 'update'),
            'content': request.form.get('content', ''),
            'media': [],
            'startsAt': request.form.get('startsAt'),
            'endsAt': request.form.get('endsAt') or None,
            'active': request.form.get('active') == 'on',
            'cta': {
                'text': request.form.get('cta_text', ''),
                'url': request.form.get('cta_url', '')
            }
        }
        
        # Handle image upload
        if 'image' in request.files:
            file = request.files['image']
            if file.filename:
                # Save to image/news/ with news slug as filename
                news_slug = news_data['slug']
                image_path = save_uploaded_file(file, 'news', use_image_dir=True, custom_filename=news_slug)
                if image_path:
                    news_data['media'] = [image_path]
        
        if utils.save_news(news_data, is_new=True):
            flash('News item added successfully!', 'success')
            return redirect(url_for('news'))
        else:
            flash('Error adding news item.', 'error')
    
    # GET request
    return render_template('edit_news.html', news_item=None, mode='add')

@app.route('/news/edit/<news_id>', methods=['GET', 'POST'])
def edit_news(news_id):
    """Edit a news item"""
    news_item = utils.get_news_by_id(news_id)
    
    if not news_item:
        flash('News item not found.', 'error')
        return redirect(url_for('news'))
    
    if request.method == 'POST':
        news_item['title'] = request.form.get('title')
        news_item['slug'] = utils.generate_slug(request.form.get('title', ''))
        news_item['type'] = request.form.get('type', 'update')
        news_item['content'] = request.form.get('content', '')
        news_item['startsAt'] = request.form.get('startsAt')
        news_item['endsAt'] = request.form.get('endsAt') or None
        news_item['active'] = request.form.get('active') == 'on'
        news_item['cta'] = {
            'text': request.form.get('cta_text', ''),
            'url': request.form.get('cta_url', '')
        }
        
        # Handle image upload
        if 'image' in request.files:
            file = request.files['image']
            if file.filename:
                # Delete old images first
                if news_item.get('media'):
                    for old_image in news_item['media']:
                        delete_image_file(old_image)
                
                # Save to image/news/ with news slug as filename
                news_slug = news_item['slug']
                image_path = save_uploaded_file(file, 'news', use_image_dir=True, custom_filename=news_slug)
                if image_path:
                    news_item['media'] = [image_path]
        
        if utils.save_news(news_item, is_new=False):
            flash('News item updated successfully!', 'success')
            return redirect(url_for('news'))
        else:
            flash('Error updating news item.', 'error')
    
    # GET request
    return render_template('edit_news.html', news_item=news_item, mode='edit')

@app.route('/news/delete/<news_id>', methods=['POST'])
def delete_news(news_id):
    """Delete a news item"""
    # Get the news item first to delete its images
    news_item = utils.get_news_by_id(news_id)
    if news_item:
        # Delete all news images
        if news_item.get('media'):
            for image_path in news_item['media']:
                delete_image_file(image_path)
    
    if utils.delete_news(news_id):
        flash('News item deleted successfully!', 'success')
    else:
        flash('Error deleting news item.', 'error')
    return redirect(url_for('news'))

# ==================== STORE SETTINGS ====================

@app.route('/store-settings', methods=['GET', 'POST'])
def store_settings():
    """Edit store settings"""
    store_info = utils.get_store_info()
    
    if request.method == 'POST':
        # Update basic info
        store_info['name'] = request.form.get('name')
        store_info['handle'] = request.form.get('handle')
        store_info['description'] = request.form.get('description')
        
        # Update contact info
        store_info['contact']['phoneE164'] = request.form.get('phone')
        store_info['contact']['email'] = request.form.get('email')
        store_info['contact']['address'] = request.form.get('address')
        
        # Update payment info
        store_info['payments']['gpayUpiId'] = request.form.get('gpayUpiId')
        store_info['payments']['instructions'] = request.form.get('payment_instructions')
        
        # Update delivery info
        delivery_areas = request.form.get('delivery_areas', '')
        store_info['delivery']['areas'] = [area.strip() for area in delivery_areas.split(',') if area.strip()]
        store_info['delivery']['shippingPolicy'] = request.form.get('shipping_policy')
        store_info['delivery']['returnsPolicy'] = request.form.get('returns_policy')
        
        # Update pricing
        tax_rate_value = request.form.get('tax_rate', '0').strip()
        store_info['pricing']['taxRatePct'] = float(tax_rate_value) if tax_rate_value else 0.0
        
        free_shipping_value = request.form.get('free_shipping_min', '999').strip()
        store_info['pricing']['freeShippingMin'] = float(free_shipping_value) if free_shipping_value else 999.0
        
        # Remove shippingFlat if it exists (we now use state-based shipping)
        if 'shippingFlat' in store_info['pricing']:
            del store_info['pricing']['shippingFlat']
        
        # Update social
        store_info['social']['instagram'] = request.form.get('instagram')

        # Parse delivery rates table entries from the form and persist them
        try:
            states = request.form.getlist('delivery_state[]')
            regions = request.form.getlist('delivery_region[]')
            charges = request.form.getlist('delivery_charge[]')
        except Exception:
            states = []
            regions = []
            charges = []

        rates = []
        # Use zip to iterate safely over the shortest list; ignore empty state entries
        for s, r, c in zip(states, regions, charges):
            state_val = (s or '').strip()
            if not state_val:
                continue
            region_val = (r or '').strip()
            # Parse charge, default to 0.0 on failure
            try:
                charge_val = float(c) if (c is not None and str(c).strip() != '') else 0.0
            except Exception:
                charge_val = 0.0

            rates.append({
                'state': state_val,
                'region': region_val,
                'charge_inr': charge_val
            })

        # Ensure delivery key exists and assign rates
        if 'delivery' not in store_info or not isinstance(store_info['delivery'], dict):
            store_info['delivery'] = {}
        store_info['delivery']['rates'] = rates
        
        # Handle logo upload
        if 'logo' in request.files:
            file = request.files['logo']
            if file.filename:
                # Delete old logo first
                if store_info.get('logo'):
                    delete_image_file(store_info['logo'])
                
                # Save to image/ folder with store-logo as filename
                image_path = save_uploaded_file(file, '', use_image_dir=True, custom_filename='store-logo')
                if image_path:
                    store_info['logo'] = image_path
        
        # Handle banner upload
        if 'banner' in request.files:
            file = request.files['banner']
            if file.filename:
                # Delete old banner first
                if store_info.get('bannerImage'):
                    delete_image_file(store_info['bannerImage'])
                
                # Save to image/ folder with store-banner as filename
                image_path = save_uploaded_file(file, '', use_image_dir=True, custom_filename='store-banner')
                if image_path:
                    store_info['bannerImage'] = image_path
        
        if utils.save_store_info(store_info):
            flash('Store settings updated successfully!', 'success')
        else:
            flash('Error updating store settings.', 'error')
        
        return redirect(url_for('store_settings'))
    
    # GET request
    return render_template('store_settings.html', store=store_info)

# ==================== API ENDPOINTS ====================

@app.route('/api/subcategories/<parent_id>')
def get_subcategories_api(parent_id):
    """API endpoint to get subcategories for a parent category"""
    subcategories = utils.get_subcategories_by_parent(parent_id)
    return jsonify(subcategories)

# ==================== SERVE UPLOADED IMAGES ====================

@app.route('/assets/<path:filename>')
def serve_assets(filename):
    """Serve images from the parent assets folder"""
    return send_from_directory(app.config['ASSETS_FOLDER'], filename)

@app.route('/image/<path:filename>')
def serve_images(filename):
    """Serve images from the parent image folder"""
    return send_from_directory(app.config['IMAGE_FOLDER'], filename)

# ==================== ERROR HANDLERS ====================

# @app.errorhandler(404)
# def not_found_error(error):
#     return render_template('404.html'), 404

# @app.errorhandler(500)
# def internal_error(error):
#     return render_template('500.html'), 500

# ==================== RUN APPLICATION ====================

if __name__ == '__main__':
    # Ensure upload directories exist in parent folder
    utils.ensure_directory_exists(app.config['ASSETS_FOLDER'])
    utils.ensure_directory_exists(os.path.join(app.config['ASSETS_FOLDER'], 'products'))
    utils.ensure_directory_exists(os.path.join(app.config['ASSETS_FOLDER'], 'categories'))
    utils.ensure_directory_exists(app.config['IMAGE_FOLDER'])
    utils.ensure_directory_exists(os.path.join(app.config['IMAGE_FOLDER'], 'news'))
    
    # Run the app
    app.run(debug=True, host='127.0.0.1', port=5000)
