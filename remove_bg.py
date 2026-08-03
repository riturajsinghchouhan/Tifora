from PIL import Image
import sys

def remove_white_bg(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()

    newData = []
    # threshold for white
    threshold = 240
    for item in datas:
        # Check if the pixel is close to white
        if item[0] >= threshold and item[1] >= threshold and item[2] >= threshold:
            # Change the white (or close to white) pixels to transparent
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)

    img.putdata(newData)
    img.save(output_path, "PNG")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python remove_bg.py input.png output.png")
        sys.exit(1)
    
    in_path = sys.argv[1]
    out_path = sys.argv[2]
    remove_white_bg(in_path, out_path)
