/**
* makecode Four Digit Display (TM1637) Package.
* From microbit/micropython Chinese community.
* http://www.micropython.org.cn
* Forked and extended by Andy Bolzmann.
*/

/**
 * Four Digit Display
 */
//% weight=100 color=#60C926 icon="7"
namespace TM1637 {
    let TM1637_CMD1 = 0x40;
    let TM1637_CMD2 = 0xC0;
    let TM1637_CMD3 = 0x80;
    let TM1637_PAUSE_TIME_US = 10;
    let _SEGMENTS = [0x3F, 0x06, 0x5B, 0x4F, 0x66, 0x6D, 0x7D, 0x07, 0x7F, 0x6F, 0x77, 0x7C, 0x39, 0x5E, 0x79, 0x71];

    /**
     * TM1637 LED display
     */
    export class TM1637LEDs {
        buf: Buffer;
        clk: DigitalPin;
        dio: DigitalPin;
        _ON: number;
        brightness: number;
        count: number;  // number of LEDs

        constructor(clk: DigitalPin, dio: DigitalPin, intensity: number, count: number) {
            this.clk = clk;
            this.dio = dio;
            this.count = count;
            this.brightness = intensity;
        }

        /**
         * initial TM1637
         */
        init(): void {
            pins.digitalWritePin(this.clk, 0);
            control.waitMicros(TM1637_PAUSE_TIME_US);
            pins.digitalWritePin(this.dio, 0);
            this._ON = 8;
            this.buf = pins.createBuffer(this.count);
            this.clear();
        }

        /**
         * Start 
         */
        _start() {
            pins.digitalWritePin(this.dio, 0);
            pins.digitalWritePin(this.clk, 0);
            control.waitMicros(TM1637_PAUSE_TIME_US);
        }

        /**
         * Stop
         */
        _stop() {
            pins.digitalWritePin(this.dio, 0);
            pins.digitalWritePin(this.clk, 1);
            control.waitMicros(TM1637_PAUSE_TIME_US);
            pins.digitalWritePin(this.dio, 1);
        }

        /**
         * send command1
         */
        _write_data_cmd() {
            this._start();
            this._write_byte(TM1637_CMD1);
            this._stop();
        }

        /**
         * send command3
         */
        _write_dsp_ctrl() {
            this._start();
            this._write_byte(TM1637_CMD3 | this._ON | this.brightness);
            this._stop();
        }

        /**
         * send a byte to 2-wire interface
         */
        _write_byte(b: number) {
            for (let i = 0; i < 8; i++) {
                pins.digitalWritePin(this.dio, (b >> i) & 1);
                pins.digitalWritePin(this.clk, 1);
                control.waitMicros(TM1637_PAUSE_TIME_US);
                pins.digitalWritePin(this.clk, 0);
                control.waitMicros(TM1637_PAUSE_TIME_US);
            }
            pins.digitalWritePin(this.clk, 1);
            control.waitMicros(TM1637_PAUSE_TIME_US);
            pins.digitalWritePin(this.clk, 0);
            control.waitMicros(TM1637_PAUSE_TIME_US);
        }

        /**
         * set TM1637 intensity, range is [0-8], 0 is off.
         * @param val the brightness of the TM1637, eg: 7
	 */
        //% blockId="TM1637_set_intensity" block="%tm|set intensity to %val"
        //% jsdoc.loc.de="Stellt die Helligkeit des Displays ein 0..7 (-1 = aus, 0 = dunkel, 7 = hell)."
        //% jsdoc.loc.en="Sets the display brightness (-1 = off, 7 = bright)."
        //% block.loc.de="%tm|Setze die Helligkeit auf %val"
        //% block.loc.en="%tm|set intensity to %val"
        //% val.loc.de="Die Helligkeit des Displays TM1637."
        //% val.loc.en="the brightness of the TM1637, eg: 7"
        //% weight=70 blockGap=8
        //% parts="TM1637" val.min=-1 val.max=7 val.dflt=7
        intensity(val: number = 7) {
            if (val < 0) {
                // this.off();
				this.clear();
                return;
            }
            if (val > 7) val = 7;
            this._ON = 8;
            this.brightness = val;
            this._write_data_cmd();
            this._write_dsp_ctrl();
        }

        /**
         * set data to TM1637, with given bit
         */
        _dat(bit: number, dat: number) {
            this._write_data_cmd();
            this._start();
            this._write_byte(TM1637_CMD2 | (bit % this.count))
            this._write_byte(dat);
            this._stop();
            this._write_dsp_ctrl();
        }

		/**
		* Send 'Error' to the TM1637, or at least as many digits as possible.
		*/
		_errorHandling() {			
			let ErrorMask = [0b1111001, 0b1010000, 0b1010000, 0b1011100, 0b1010000];
			let counttmp = 0
			for (let i = 0; i < Math.min(this.count,5); i++) {
				this._dat(i, ErrorMask[i])
				counttmp++
			}
			for (let i = counttmp; i < this.count; i++) {
				this._dat(i, 0)
			}
		}
        
        /**
         * Schaltet die Segmente a–g an einer Stelle des Displays ein oder aus.
		 *
		 * Bedeutung der Segmente:
		 * a = oben 
		 * b = rechts-oben 
		 * c = rechts-unten 
		 * d = unten 
		 * e = links-unten 
		 * f = links-oben     
		 * g = Mitte 
		 * 
		 * 
		 * 
		 * 
         * @param a Segment a (top)
         * @param b Segment b (right top)
         * @param c Segment c (right bottom)
         * @param d Segment d (bottom)
         * @param e Segment e (left bottom)
         * @param f Segment f (left top)
         * @param g Segment g (middle)
	 	 * @param pos Digit at display of TM1637, eg: 0
		*/
        //% blockId="TM1637_segmentsAt" block="$this(tm)|segments a %a b %b c %c d %d e %e f %f g %g|at %pos"
        //% block.loc.de="$this(tm)|Segmente:| a %a b %b c %c d %d e %e f %f g %g|an der Stelle %pos einschalten."
        //% block.loc.en="$this(tm)|segments:| a %a b %b c %c d %d e %e f %f g %g|at %pos"
        //% a.loc.de="Segment a (oben)"
        //% a.loc.en="Segment a (top)"
        //% b.loc.de="Segment b (rechts oben)"
        //% b.loc.en="Segment b (right top)"
        //% c.loc.de="Segment c (rechts unten)"
        //% c.loc.en="Segment c (right bottom)"
        //% d.loc.de="Segment d (unten)"
        //% d.loc.en="Segment d (bottom)"
        //% e.loc.de="Segment e (links unten)"
        //% e.loc.en="Segment e (left bottom)"
        //% f.loc.de="Segment f (links oben)"
        //% f.loc.en="Segment f (left top)"
        //% g.loc.de="Segment g (Mitte)"
        //% g.loc.en="Segment g (middle)"
        //% pos.loc.de="Stelle im Display des TM1637, z.B. 0 (ganz links)"
        //% pos.loc.en="Digit at display of TM1637, e.g. 0 (most left)"
        //% inlineInputMode=external
        //% weight=90 blockGap=8 advanced=true
        //% parts="TM1637" pos.min=0 pos.max=3 pos.dflt=0
        segmentsAt(a: boolean, b: boolean, c: boolean, d: boolean, e: boolean, f: boolean, g: boolean, pos: number = 0) {
            let mask = 0
            if (a) mask |= 1 << 0
            if (b) mask |= 1 << 1
            if (c) mask |= 1 << 2
            if (d) mask |= 1 << 3
            if (e) mask |= 1 << 4
            if (f) mask |= 1 << 5
            if (g) mask |= 1 << 6
            //if (dp) mask |= 1 << 7			
            this.buf[pos % this.count] = mask & 0xFF
            this._dat(pos, mask & 0xFF)
        }
		

        /**
         * Light indicated segments (bitmask) at given position.
         *
		 * Bedeutung der Segmente:
		 * a = oben 
		 * b = rechts-oben 
		 * c = rechts-unten 
		 * d = unten 
		 * e = links-unten 
		 * f = links-oben     
		 * g = Mitte 
		 * 
         * | Segment bits (MSB -> LSB): 
         * bit6=g, bit5=f, bit4=e, bit3=d, bit2=c, bit1=b, bit0=a
         *
         * Example:
         * "8" (all segments a..g): 0b1111111
         * "4" (b,c,f,g):           0b1100110
         * @param segmentsText Segment-bitmask (binary recommended), eg: "0b1110110"
         * @param pos Digit position (0..count-1), eg: 0
	*/
        //% blockId="TM1637_lightsegmentsat" block="$this(tm)|light segments (bits) %segmentsText|at %pos"
        //% jsdoc.loc.de="Zeigt Segmente über eine Bitmaske an (für Fortgeschrittene), z.B. 0b01110110 für H oder 0b01100110 für 4."
        //% jsdoc.loc.en="Lights segments using a bitmask (advanced)."
        //% block.loc.de="$this(tm)|Segmente (binär) %segmentsText|der Stelle %pos einschalten."
        //% block.loc.en="$this(tm)|light segments (bits) %segmentsText|at %pos"
        //% segmentsText.loc.de="Segment-BitMaske (empfohlen binär), z.B. 0b1111111 für 8 oder 0b1100110 für 4"
        //% segmentsText.loc.en="Segment-bitmask (binary recommended), e.g. 0b1111111 for 8 or 0b1100110 for 4"
        //% pos.loc.de="Stelle im Display des TM1637, z.B. 0 (ganz links)"
        //% pos.loc.en="Digit position (0..count-1)"
        //% weight=80 blockGap=8 advanced=true
		//% parts="TM1637" segmentsText.dflt="0b1110110" pos.min=0 pos.max=3 pos.dflt=0
        //% segmentsText.shadow="text"
        lightSegmentsAt(segmentsText: string = "0b1110110", pos: number = 0) {
            let segments = parseBinText(segmentsText)
			if (segments == -1) {
				this._errorHandling()
				return;
			}
            this.buf[pos % this.count] = segments & 0x7F
            this._dat(pos, segments & 0x7F)
        }

		

        
        /**
         * show a number in given position.
         * @param num Number to be shown, eg: 5
         * @param bit Digit position, eg: 0
	*/
        //% blockId="TM1637_showbit" block="%tm|show number %num |at %bit"
        //% jsdoc.loc.de="Zeigt eine einzelne Ziffer an einer bestimmten Stelle."
        //% jsdoc.loc.en="Shows a single digit at a given position."
        //% block.loc.de="%tm|Setze die Ziffer %num |an die Stelle %bit"
        //% block.loc.en="%tm|show number %num |at %bit"
        //% num.loc.de="Ziffer, die angezeigt werden soll, z.B. 5"
        //% num.loc.en="Number to be shown, e.g. 5"
        //% bit.loc.de="Stelle im Display des TM1637, z.B. 0 (ganz links)"
        //% bit.loc.en="Digit position, e.g. 0 (most left)"
        //% weight=60 blockGap=8
        //% parts="TM1637" num.min=0 num.max=15 num.dflt=5 bit.min=0 bit.max=3
        showbit(num: number = 5, bit: number = 0) {
			// bei num=-1 wird das Digit ausgeschaltet
		    if (num < 0) {
		        this.buf[bit % this.count] = 0
		        this._dat(bit % this.count, 0)
		        return
		    }
            this.buf[bit % this.count] = _SEGMENTS[num % 16]
            this._dat(bit % this.count, _SEGMENTS[num % 16])
        }

        /**
          * show a number. 
          * @param num Number to be shown, eg: 281
	*/
        //% blockId="TM1637_shownumwithleadingzeros" block="%tm|show number %num with leading zeros"
        //% jsdoc.loc.de="Zeigt eine Zahl auf dem Display an, z.B. 28 als 0028."
        //% jsdoc.loc.en="Shows a number on the display."
        //% block.loc.de="%tm|Zeige die Zahl %num und fülle vorne mit Nullen auf."
        //% block.loc.en="%tm|show number %num with leading zeros"
        //% num.loc.de="Zahl, die angezeigt werden soll, z.B. 281"
        //% num.loc.en="Number to be shown, e.g. 281"
        //% weight=40 blockGap=8
        //% parts="TM1637" num.min=-999 num.max=9999 num.dflt=281
        showNumberWithLeadingZeros(num: number) {
            if (num < 0) {
                this._dat(0, 0x40) // '-'
                num = -num
            }
            else
                this.showbit(Math.idiv(num, 1000) % 10)
            this.showbit(num % 10, 3)
            this.showbit(Math.idiv(num, 10) % 10, 2)
            this.showbit(Math.idiv(num, 100) % 10, 1)
        }

        /**
          * show a number with max 4 digits. 
          * @param num is a number with max 4 digits, eg: 1284
	*/
        //% blockId="TM1637_shownum" block="%tm|show number %num"
        //% jsdoc.loc.de="Zeigt eine Zahl auf dem Display an."
        //% jsdoc.loc.en="Shows a number on the display."
        //% block.loc.de="%tm|Zeige die Zahl %num"
        //% block.loc.en="%tm|show number %num"
        //% num.loc.de="Eine Zahl mit max. 4 Stellen, z.B. 1284"
        //% num.loc.en="is a number with max 4 digits, eg: 1284"
        //% weight=50 blockGap=8
        //% parts="TM1637" num.min=-999 num.max=9999 num.dflt=1284
        showNumber(num: number) {
			//this.clear()			
			let sign = 0
            if (num < 0) {
				sign = -1
                num = -num
            }
			for (let i = 0; i < this.count; i++) {
				if (num >= 10**i) this.showbit(Math.idiv(num, 10**i) % 10, this.count-1-i); 
				else this.showbit(-1, this.count-1-i);
			}
			if (num == 0) this.showbit(0, this.count-1)
            if (sign < 0) {
                this._dat(3 - Math.min(3, Math.abs(num).toString().length), 0x40) // '-'
            }
        }

        /**
          * show a hex number. 
          * @param numText a hex number, eg: 0xA7F
	*/
        //% blockId="TM1637_showhex" block="%tm|show hex number %numText"
        //% jsdoc.loc.de="Zeigt eine Zahl im Hex-Format (0–F) an."
        //% jsdoc.loc.en="Shows a number in hex (0–F)."
        //% block.loc.de="%tm|Zeige die Hexadezimalzahl %numText"
        //% block.loc.en="%tm|show hex number %numText"
        //% numText.loc.de="Eine Hexadezimalzahl, z.B. 0xA7F"
        //% numText.loc.en="a hex number, eg: 0xA7F"
        //% weight=30 blockGap=8
        //% parts="TM1637"
		//% numText.shadow="text"
        showHex(numText: string) {
            let num = parseHexText(numText, this.count)
			if (num == -1) {
				this._errorHandling()
				return;
			}
			if (num > 0xFFF) this.showbit(Math.idiv(num, 0x1000) % 16, 0); 
			else this.showbit(-1,0);
			if (num >  0xFF) this.showbit(Math.idiv(num, 0x100) % 16, 1); 
			else this.showbit(-1,1);
			if (num >   0xF) this.showbit(Math.idiv(num, 0x10) % 16, 2); 
			else this.showbit(-1,2);
			if (num >=  0x0) this.showbit(num % 16, 3); 
			else this.showbit(-1,3);
        }

        /**
         * show or hide dot point. 
         * @param bit is the position, eg: 1
         * @param show is show/hide dp, eg: true
	*/
        //% blockId="TM1637_showDP" block="%tm|DotPoint at %bit|show %show"
        //% jsdoc.loc.de="Schaltet den Dezimalpunkt (oder Doppelpunkt) ein oder aus."
        //% jsdoc.loc.en="Shows or hides the dot point."
        //% block.loc.de="%tm|Dezimalpunkt rechts der Stelle %bit| setzen %show"
        //% block.loc.en="%tm|DotPoint at %bit|show %show"
        //% bit.loc.de="Stelle im Display, von der rechts der Punkt angezeigt werden soll, z.B. 1"
        //% bit.loc.en="is the position, eg: 1"
        //% show.loc.de="EIN = Wahr, AUS = Falsch"
        //% show.loc.en="is show/hide dp, eg: true"
        //% weight=20 blockGap=8
        //% parts="TM1637"
        showDP(bit: number = 1, show: boolean = true) {
            bit = bit % this.count
            if (show) this._dat(bit, this.buf[bit] | 0x80)
            else this._dat(bit, this.buf[bit] & 0x7F)
        }

        /**
         * clear LED. 
         */
        //% blockId="TM1637_clear" block="clear all digits of %tm"
        //% jsdoc.loc.de="Löscht die Anzeige (alle Segmente aus)."
        //% jsdoc.loc.en="Clears the display (all segments off)."
        //% block.loc.de="Lösche alle Stellen des Displays %tm"
        //% block.loc.en="clear all digits of %tm"
        //% weight=10 blockGap=8
        //% parts="TM1637"
        clear() {
            for (let i = 0; i < this.count; i++) {
                this._dat(i, 0)
                this.buf[i] = 0
            }
        }

        /**
         * turn on LED. 
         */
        //% blockId="TM1637_on" block="turn on %tm"
        //% jsdoc.loc.de="Schaltet das Display ein."
        //% jsdoc.loc.en="Turns the display on."
        //% block.loc.de="Schalte das Display %tm ein."
        //% block.loc.en="turn on %tm"
        //% weight=90 blockGap=8
        //% parts="TM1637"
        on() {
            this._ON = 8;
            this._write_data_cmd();
            this._write_dsp_ctrl();
        }

        /**
         * turn off LED. 
         */
        //% blockId="TM1637_off" block="turn off %tm"
        //% jsdoc.loc.de="Schaltet das Display aus."
        //% jsdoc.loc.en="Turns the display off."
        //% block.loc.de="Schalte das Display %tm aus."
        //% block.loc.en="turn off %tm"
        //% weight=80 blockGap=8
        //% parts="TM1637"
        off() {
            this._ON = 0;
            this._write_data_cmd();
            this._write_dsp_ctrl();			
        }      
		
    }
	

	/**
	* Helper function to strip whitespaces and underscores
	*/
	function _stripSeparators(text: string): string {
	    let out = ""
	    for (let i = 0; i < text.length; i++) {
	        const c = text.charAt(i)
	        // entfernt Leerzeichen, Tabs, CR/LF und _
	        if (c == " " || c == "\t" || c == "\r" || c == "\n" || c == "_") continue
	        out += c
	    }
	    return out
	}
	/**
	* Helper function to check, if binary string contains only 0 and 1
	*/
	function _isBinDigits(s: string): boolean {
	    if (s.length == 0) return false
	    for (let i = 0; i < s.length; i++) {
	        const c = s.charAt(i)
	        if (c != "0" && c != "1") return false
	    }
	    return true
	}
	/**
	* Helper function to check, if hex string contains only hex letters
	*/
	function _isHexDigits(s: string): boolean {
	    if (s.length == 0) return false
	    for (let i = 0; i < s.length; i++) {
	        const code = s.charCodeAt(i)
	        const is09 = (code >= 48 && code <= 57)
	        const isAF = (code >= 65 && code <= 70)
	        const isaf = (code >= 97 && code <= 102)
	        if (!(is09 || isAF || isaf)) return false
	    }
	    return true
	}


	
    /**
     * Parse text in formats and convert to numbers:
     * - 0b1010... (binary, only 0/1, NO negative allowed)
     * - 0xA7F...  (hex, only 0-9/A-F/a-f, NO negative allowed, if >2 hex digits -> last 2 digits used)
     * Returns -1 on invalid input.
     */
    function parseBinText(text: string): number {
        if (!text) return -1;

        // remove spaces and underscores
        let s = _stripSeparators(text);
        if (s.length == 0) return -1;

        // sign negative is invalid
        let sign = 1;
        if (s.charAt(0) == "-") { sign = -1; s = s.substr(1); }
        else if (s.charAt(0) == "+") { s = s.substr(1); }

        if (s.length == 0) return -1;
		if (sign < 0) return -1; // no negative numbers allowed.

        // binary
        if (s.length >= 2 && (s.substr(0, 2) == "0b" || s.substr(0, 2) == "0B")) {
            let bits = s.substr(2);
            if (bits.length == 0) return -1;
            if (!_isBinDigits(bits)) return -1; // if bits contains any other than 0 or 1
			
            // keep last 7 bin digits if longer
            if (bits.length > 7) bits = bits.substr(bits.length - 7);
			
            let bitsnum =  parseInt(bits, 2);
			if (isNaN(bitsnum)) return -1;
			return bitsnum;
        }

        // hex
        if (s.length >= 2 && (s.substr(0, 2) == "0x" || s.substr(0, 2) == "0X")) {
            let hex = s.substr(2);
            if (hex.length == 0) return -1;
            if (!_isHexDigits(hex)) return -1; // if hex contains any other than allowed hex letters

            // keep last 2 hex digits if longer
            if (hex.length > 2) hex = hex.substr(hex.length - 2);
			if (hex.length == 0) return -1;

			let hexNum = parseInt(hex, 16);
			if (isNaN(hexNum)) return -1;
			hexNum &= 0x7F
			return hexNum;
        }
		return -1;
    }

    /**
     * Parse text in formats and convert to numbers:
     * - 0xA7F...  (hex, only 0-9/A-F/a-f, NO negative allowed, if >4 hex digits -> last 4 digits used)
     * Returns -1 on invalid input.
     */
    function parseHexText(text: string, digitCount: number): number {
        if (!text) return -1;

        // remove spaces and underscores
        let s = _stripSeparators(text);
        if (s.length == 0) return -1;

        // sign negative is invalid
        let sign = 1;
        if (s.charAt(0) == "-") { sign = -1; s = s.substr(1); }
        else if (s.charAt(0) == "+") { s = s.substr(1); }

        if (s.length == 0) return -1;
		if (sign < 0) return -1; // no negative numbers allowed.

        // hex
        if (s.length >= 2 && (s.substr(0, 2) == "0x" || s.substr(0, 2) == "0X")) {
            let hex = s.substr(2);
            if (hex.length == 0) return -1;
            if (!_isHexDigits(hex)) return -1; // if hex contains any other than allowed hex letters

            // keep last 'digitCount' hex digits if longer
            if (hex.length > digitCount) hex = hex.substr(hex.length - digitCount);
			if (hex.length == 0) return -1;

			let hexNum = parseInt(hex, 16);
			if (isNaN(hexNum)) return -1;
			return hexNum;
        }
		return -1;		
    }




	
    /**
     * create a Digit Display (TM1637) object.
     * @param clk the CLK pin for TM1637, eg: DigitalPin.P0
     * @param dio the DIO pin for TM1637, eg: DigitalPin.P1
     * @param intensity the brightness of the LED, eg: 7
     * @param count the count of the LED, eg: 4
     */
    //% weight=200 blockGap=8
    //% blockId="TM1637_create" block="CLK %clk|DIO %dio|brightness %intensity|digit count %count"
    //% block.loc.de="CLK %clk|DIO %dio|Helligkeit %intensity|Anzahl Stellen %count"
    //% block.loc.en="CLK %clk|DIO %dio|brightness %intensity|digit count %count"
    //% clk.loc.de="Pin für das Clock Signal (CLK)"
    //% clk.loc.en="Pin used for Clock Signal (CLK)"
    //% dio.loc.de="Pin für das Daten Signal (DIO)"
    //% dio.loc.en="Pin used for Data Signal (DIO)"
    //% intensity.loc.de="Helligkeit des Displays (0..7)"
    //% intensity.loc.en="Intensity of display (0..7)"
    //% count.loc.de="Anzahl der Stellen des Displays, z.B. 4"
    //% count.loc.en="Count of digits of display, e.g. 4"
    //% inlineInputMode=inline count.min=1 count.max=4 count.dflt=4 intensity.min=0 intensity.max=7 intensity.dflt=7
    //% blockSetVariable=tm
    export function create(clk: DigitalPin, dio: DigitalPin, intensity: number, count: number = 4): TM1637LEDs {
        let tm = new TM1637LEDs(clk, dio, intensity, count);
        tm.init();
        return tm;
	}

    
}
